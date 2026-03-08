import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { WeaponType } from '../config/constants';

interface GameState {
    lives: number;
    score: number;
    weapon: WeaponType;
    isShopOpen: boolean;
    isGameOver: boolean;
}

interface GameContextType {
    state: GameState;
    updateScore: (val: number) => void;
    updateLives: (val: number) => void;
    setWeapon: (val: WeaponType) => void;
    toggleShop: (open: boolean) => void;
    setGameOver: (over: boolean) => void;
    resetGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<GameState>({
        lives: 3,
        score: 0,
        weapon: 'NORMAL',
        isShopOpen: false,
        isGameOver: false,
    });

    const updateScore = useCallback((val: number) => {
        setState(prev => ({ ...prev, score: prev.score + val }));
    }, []);

    const updateLives = useCallback((val: number) => {
        setState(prev => {
            const newLives = Math.max(0, prev.lives + val);
            return {
                ...prev,
                lives: newLives,
                isGameOver: newLives === 0
            };
        });
    }, []);

    const setWeapon = useCallback((val: WeaponType) => {
        setState(prev => ({ ...prev, weapon: val }));
    }, []);

    const toggleShop = useCallback((open: boolean) => {
        setState(prev => ({ ...prev, isShopOpen: open }));
    }, []);

    const setGameOver = useCallback((over: boolean) => {
        setState(prev => ({ ...prev, isGameOver: over }));
    }, []);

    const resetGame = useCallback(() => {
        setState({
            lives: 3,
            score: 0,
            weapon: 'NORMAL',
            isShopOpen: false,
            isGameOver: false,
        });
    }, []);

    return (
        <GameContext.Provider value={{ state, updateScore, updateLives, setWeapon, toggleShop, setGameOver, resetGame }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) throw new Error('useGame must be used within GameProvider');
    return context;
};
