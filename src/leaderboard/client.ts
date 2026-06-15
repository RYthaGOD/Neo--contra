// Lightweight leaderboard client. Talks to the bundled Express + SQLite API
// (served same-origin in production on Railway). Falls back gracefully to an
// empty/offline state when the API isn't reachable (e.g. `vite dev` with no
// server running), so the UI never crashes.

export interface ScoreEntry {
    wallet_address: string;
    score: number;
    level_reached: number;
    created_at?: string;
}

// Same-origin by default; override with VITE_LEADERBOARD_URL for a split deploy.
const BASE = (import.meta.env.VITE_LEADERBOARD_URL as string) || '';

export const submitScore = async (entry: ScoreEntry) => {
    const res = await fetch(`${BASE}/api/scores`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error(`submitScore failed: ${res.status}`);
    return res.json();
};

export const getTopScores = async (limit = 10): Promise<ScoreEntry[]> => {
    try {
        const res = await fetch(`${BASE}/api/scores?limit=${limit}`);
        if (!res.ok) return [];
        return (await res.json()) as ScoreEntry[];
    } catch {
        return []; // offline / no backend configured
    }
};
