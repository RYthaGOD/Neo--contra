import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { submitScore, getTopScores, ScoreEntry } from '../../supabase/client';
import { Trophy, Send, RefreshCw } from 'lucide-react';

export const LeaderboardUI: React.FC = () => {
    const { state, resetGame } = useGame();
    const { publicKey } = useWallet();
    const [scores, setScores] = useState<ScoreEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const loadScores = async () => {
        setLoading(true);
        try {
            const data = await getTopScores();
            setScores(data as ScoreEntry[]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!publicKey) return alert('Connect wallet to submit score!');
        setLoading(true);
        try {
            await submitScore({
                wallet_address: publicKey.toBase58(),
                score: state.score,
                level_reached: 1, // Currently only 1 level
            });
            setSubmitted(true);
            loadScores();
        } catch (err) {
            console.error('Score submission failed:', err);
        } finally {
            setLoading(true); // Keep loading state until refresh
            loadScores();
        }
    };

    useEffect(() => {
        loadScores();
    }, []);

    return (
        <div className="absolute inset-0 bg-black/95 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
            <div className="bg-black border-4 border-neon-green p-8 w-full max-w-lg shadow-[0_0_50px_rgba(0,255,0,0.3)] relative">
                <h2 className="text-4xl text-neon-green mb-8 text-center uppercase tracking-tighter font-black skew-x-[-10deg]">
                    Mission Results
                </h2>

                <div className="mb-8 text-center bg-neon-green/10 p-4 border border-neon-green/20">
                    <div className="text-neon-green text-[10px] uppercase font-bold opacity-70">Final Score</div>
                    <div className="text-5xl text-white font-black">{String(state.score).padStart(6, '0')}</div>
                </div>

                <div className="space-y-2 mb-8 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    <h3 className="text-xs text-neon-blue uppercase mb-4 flex items-center gap-2 font-bold">
                        <Trophy className="w-3 h-3" /> Global High Command
                    </h3>
                    {scores.map((s, i) => (
                        <div key={i} className="flex justify-between text-[10px] p-2 border border-white/5 bg-white/5">
                            <span className="text-white/50">{s.wallet_address.slice(0, 4)}...{s.wallet_address.slice(-4)}</span>
                            <span className="text-neon-green font-bold">{s.score} PTS</span>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-4">
                    {!submitted && (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-neon-blue text-black py-3 font-black uppercase text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                            Log score to Solana Ops
                        </button>
                    )}

                    <button
                        onClick={resetGame}
                        className="border-2 border-neon-green text-neon-green py-3 font-black uppercase text-sm hover:bg-neon-green hover:text-black transition-all"
                    >
                        Restart Protocol
                    </button>
                </div>
            </div>
        </div>
    );
};
