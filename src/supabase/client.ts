import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ScoreEntry {
    wallet_address: string;
    score: number;
    level_reached: number;
    created_at?: string;
}

export const submitScore = async (entry: ScoreEntry) => {
    if (!supabaseUrl) return;
    const { data, error } = await supabase
        .from('leaderboard')
        .upsert(entry, { onConflict: 'wallet_address' });

    if (error) throw error;
    return data;
};

export const getTopScores = async (limit = 10) => {
    if (!supabaseUrl) return [];
    const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
};
