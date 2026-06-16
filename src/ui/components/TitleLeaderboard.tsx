import React, { useEffect, useState } from 'react';
import { getTopScores, ScoreEntry } from '../../leaderboard/client';
import { Trophy } from 'lucide-react';

// Compact global leaderboard shown on the TITLE screen so players see the
// competition before they even start (drives replays + score submissions).
// Rendered inside the scaled overlay (aligns with the Phaser title art) and is
// click-through (pointer-events-none) so tapping anywhere still starts the game.
export const TitleLeaderboard: React.FC = () => {
    const [scores, setScores] = useState<ScoreEntry[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let alive = true;
        getTopScores(5)
            .then(s => { if (alive) { setScores(s); setLoaded(true); } })
            .catch(() => { if (alive) setLoaded(true); });
        return () => { alive = false; };
    }, []);

    return (
        <div className="absolute pointer-events-none font-retro" style={{ left: 556, top: 246, width: 236 }}>
            <div className="border-2 border-neon-purple/70 bg-black/55 p-2 shadow-[0_0_16px_rgba(188,19,254,0.35)]">
                <div className="mb-2 flex items-center gap-1.5 text-[8px] uppercase text-neon-blue">
                    <Trophy className="h-3 w-3" /> Top Commanders
                </div>
                {!loaded && <div className="animate-pulse text-[7px] text-neon-blue/70">LOADING…</div>}
                {loaded && scores.length === 0 && (
                    <div className="text-[7px] leading-relaxed text-gray-500">NO SCORES YET —<br />BE THE FIRST.</div>
                )}
                <div className="space-y-1">
                    {scores.map((s, i) => (
                        <div key={i} className="flex justify-between text-[7px]">
                            <span className="text-white/55">{i + 1}. {s.wallet_address.slice(0, 4)}…{s.wallet_address.slice(-4)}</span>
                            <span className="text-neon-green">{s.score.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
