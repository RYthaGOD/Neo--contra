import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { WeaponType, SkinId } from '../config/constants';

const SKIN_KEY = 'neocontra.skin';
const loadSkin = (): SkinId => {
    try {
        const s = localStorage.getItem(SKIN_KEY);
        if (s === 'GOLD' || s === 'SOLANA' || s === 'DIAMOND' || s === 'DEFAULT') return s;
    } catch { /* ignore unavailable storage */ }
    return 'DEFAULT';
};

interface GameState {
    lives: number;
    score: number;
    weapon: WeaponType;
    weaponLevel: number;
    skin: SkinId;     // cosmetic player skin; persists across runs
    isShopOpen: boolean;
    isGameOver: boolean;
    won: boolean;
    level: number;
    scene: string; // active Phaser scene: 'boot' | 'title' | 'game' | 'win'
}

interface GameContextType {
    state: GameState;
    updateScore: (delta: number) => void;
    updateLives: (delta: number) => void;
    setWeapon: (val: WeaponType, level?: number) => void;
    setSkin: (val: SkinId) => void;
    toggleShop: (open: boolean) => void;
    setGameOver: (over: boolean) => void;
    setVictory: (won: boolean) => void;
    setScene: (name: string) => void;
    revive: () => void;
    resetGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const DEFAULT_STATE: GameState = {
    lives: 3,
    score: 0,
    weapon: 'NORMAL',
    weaponLevel: 1,
    skin: 'DEFAULT',
    isShopOpen: false,
    isGameOver: false,
    won: false,
    level: 1,
    scene: 'boot',
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<GameState>({ ...DEFAULT_STATE, skin: loadSkin() });
    const stateRef = useRef(state);
    stateRef.current = state;

    const updateScore = useCallback((delta: number) => {
        setState(prev => ({ ...prev, score: prev.score + delta }));
    }, []);

    const updateLives = useCallback((delta: number) => {
        setState(prev => {
            const newLives = Math.max(0, prev.lives + delta);
            return { ...prev, lives: newLives, isGameOver: newLives === 0 };
        });
    }, []);

    const setWeapon = useCallback((val: WeaponType, level = 1) => {
        setState(prev => ({ ...prev, weapon: val, weaponLevel: level }));
    }, []);

    const setSkin = useCallback((val: SkinId) => {
        try { localStorage.setItem(SKIN_KEY, val); } catch { /* ignore */ }
        setState(prev => ({ ...prev, skin: val }));
    }, []);

    const toggleShop = useCallback((open: boolean) => {
        setState(prev => ({ ...prev, isShopOpen: open }));
    }, []);

    const setGameOver = useCallback((over: boolean) => {
        setState(prev => ({ ...prev, isGameOver: over }));
    }, []);

    const setVictory = useCallback((won: boolean) => {
        // A victory also opens the score screen, but flagged as a win so the UI
        // reads "MISSION COMPLETE" rather than "GAME OVER".
        setState(prev => ({ ...prev, won, isGameOver: true }));
    }, []);

    const setScene = useCallback((name: string) => {
        // Reset transient game state when returning to the title.
        setState(prev => name === 'title'
            ? { ...prev, scene: name, isGameOver: false, isShopOpen: false }
            : { ...prev, scene: name });
    }, []);

    // Pay-to-continue: restore lives and clear game over, keeping the score.
    const revive = useCallback(() => {
        setState(prev => ({ ...prev, lives: 3, isGameOver: false, won: false }));
    }, []);

    const resetGame = useCallback(() => {
        // Keep the cosmetic skin — it's a holder unlock, not run state.
        setState(prev => ({ ...DEFAULT_STATE, skin: prev.skin }));
    }, []);

    // Keep registry lives/score readable to Phaser without re-creating callbacks
    useEffect(() => {
        // Expose raw readable values into the global registry via a shared ref
        // (Phaser reads these synchronously; React callbacks above mutate them).
        (window as any).__neoContraState = stateRef;
    }, []);

    return (
        <GameContext.Provider value={{ state, updateScore, updateLives, setWeapon, setSkin, toggleShop, setGameOver, setVictory, setScene, revive, resetGame }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => {
    const ctx = useContext(GameContext);
    if (!ctx) throw new Error('useGame must be used within GameProvider');
    return ctx;
};
