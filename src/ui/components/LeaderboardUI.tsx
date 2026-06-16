import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { submitScore, getTopScores, ScoreEntry } from '../../leaderboard/client';
import { buyItem } from '../../solana/TransactionLogic';
import { DEV_WALLET, PRICES, CURRENCY, TOKEN_CA, TOKEN_SYMBOL } from '../../config/constants';
import { Trophy, Send, RefreshCw, RotateCcw, Zap } from 'lucide-react';

// X (formerly Twitter) logo — lucide ships only the legacy bird, so inline the mark.
const XLogo: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

export const LeaderboardUI: React.FC = () => {
    const { state, resetGame, revive } = useGame();
    const wallet = useWallet();
    const { publicKey } = wallet;
    const { connection } = useConnection();
    const [scores, setScores] = useState<ScoreEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [reviving, setReviving] = useState(false);

    const devMode = !DEV_WALLET || DEV_WALLET.startsWith('Replace');
    const handleRevive = async () => {
        setReviving(true);
        try {
            if (!devMode) {
                if (!publicKey) { alert('Connect your wallet to continue!'); setReviving(false); return; }
                await buyItem(connection, wallet as any, DEV_WALLET, PRICES.REVIVE);
            }
            revive();                                       // restore React state
            window.dispatchEvent(new CustomEvent('game_revive')); // resume the run
        } catch (err) {
            console.error('Revive failed:', err);
        } finally {
            setReviving(false);
        }
    };

    const loadScores = async () => {
        setLoading(true);
        try {
            const data = await getTopScores();
            setScores(data as ScoreEntry[]);
        } catch {
            /* offline or no Supabase configured */
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!publicKey) { alert('Connect wallet to submit score!'); return; }
        setLoading(true);
        try {
            await submitScore({
                wallet_address: publicKey.toBase58(),
                score: state.score,
                level_reached: state.level,
            });
            setSubmitted(true);
        } catch (err) {
            console.error('Score submission failed:', err);
        } finally {
            await loadScores();
        }
    };

    const shareToX = () => {
        const ticker = TOKEN_CA ? ` ${TOKEN_SYMBOL}` : '';
        const verb = state.won ? 'beat' : 'scored';
        const text = state.won
            ? `I beat NeoContra: Solana Assault with ${state.score.toLocaleString()} points!${ticker} 🎮🔫\n\nThink you can outgun me? 🏆`
            : `I ${verb} ${state.score.toLocaleString()} & reached Level ${state.level} in NeoContra: Solana Assault!${ticker} 🎮🔫\n\nThink you can outgun me? 🏆`;
        const url = typeof window !== 'undefined' ? window.location.origin : '';
        const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
            + (url ? `&url=${encodeURIComponent(url)}` : '')
            + '&hashtags=NeoContra,Solana';
        window.open(intent, '_blank', 'noopener,noreferrer');
    };

    useEffect(() => { loadScores(); }, []);

    return (
        <div className="absolute inset-0 bg-black/95 flex items-center justify-center p-4 z-[100] backdrop-blur-md pointer-events-auto">
            <div className="bg-black border-4 border-neon-green p-6 w-full max-w-md shadow-[0_0_40px_rgba(0,255,0,0.3)]">
                <h2 className={`text-3xl mb-6 text-center font-retro uppercase ${state.won ? 'text-neon-blue' : 'text-neon-green'}`}>
                    {state.won ? 'MISSION COMPLETE' : 'GAME OVER'}
                </h2>

                <div className="mb-6 text-center bg-neon-green/10 p-4 border border-neon-green/20">
                    <div className="text-neon-green text-[8px] font-retro uppercase opacity-70 mb-1">FINAL SCORE</div>
                    <div className="text-4xl text-white font-retro">{String(state.score).padStart(8, '0')}</div>
                    <div className="text-[8px] font-retro text-neon-blue mt-1">LEVEL REACHED: {state.level}</div>
                </div>

                {/* Leaderboard */}
                <div className="mb-6">
                    <h3 className="text-[8px] font-retro text-neon-blue uppercase mb-3 flex items-center gap-2">
                        <Trophy className="w-3 h-3" /> GLOBAL HIGH COMMAND
                    </h3>
                    {loading && <div className="text-center text-neon-blue text-[8px] font-retro animate-pulse">LOADING...</div>}
                    {scores.length === 0 && !loading && (
                        <div className="text-center text-gray-600 text-[8px] font-retro">NO SCORES YET</div>
                    )}
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {scores.map((s, i) => (
                            <div key={i} className="flex justify-between text-[8px] font-retro p-2 border border-white/5 bg-white/5">
                                <span className="text-white/50">{i + 1}. {s.wallet_address.slice(0, 4)}…{s.wallet_address.slice(-4)}</span>
                                <span className="text-neon-green">{s.score.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    {!state.won && (
                        <button onClick={handleRevive} disabled={reviving}
                            className="w-full py-2.5 bg-neon-purple text-black font-retro text-[8px] uppercase flex items-center justify-center gap-2 disabled:opacity-40 animate-pulse">
                            {reviving ? <RefreshCw className="animate-spin w-3 h-3" /> : <Zap className="w-3 h-3" />}
                            CONTINUE — {devMode ? 'FREE (DEV)' : `${PRICES.REVIVE} ${CURRENCY}`}
                        </button>
                    )}
                    {!submitted && (
                        <button onClick={handleSubmit} disabled={loading}
                            className="w-full py-2.5 bg-neon-blue text-black font-retro text-[8px] uppercase flex items-center justify-center gap-2 disabled:opacity-40">
                            {loading ? <RefreshCw className="animate-spin w-3 h-3" /> : <Send className="w-3 h-3" />}
                            SUBMIT SCORE
                        </button>
                    )}
                    <button onClick={shareToX}
                        className="w-full py-2.5 bg-white text-black font-retro text-[8px] uppercase flex items-center justify-center gap-2 hover:bg-gray-200 transition-all">
                        <XLogo className="w-3 h-3" />
                        SHARE ON X
                    </button>
                    <button onClick={() => {
                        resetGame();
                        // Tell Phaser to go back to title
                        const win = window as any;
                        const game = win.__phaserGame as any;
                        if (game) {
                            game.scene.stop('GameScene');
                            game.scene.start('TitleScene');
                        }
                    }}
                        className="w-full py-2.5 border-2 border-neon-green text-neon-green font-retro text-[8px] uppercase flex items-center justify-center gap-2 hover:bg-neon-green hover:text-black transition-all">
                        <RotateCcw className="w-3 h-3" />
                        RESTART MISSION
                    </button>
                </div>
            </div>
        </div>
    );
};
