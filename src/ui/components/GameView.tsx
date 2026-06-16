import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GAME_CONFIG } from '../../game/config';
import { useGame } from '../../context/GameContext';

const GameView: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const { state, updateScore, updateLives, toggleShop, setGameOver, setVictory, revive, resetGame, setWeapon, setScene } = useGame();

    // Create the Phaser game instance once
    useEffect(() => {
        if (gameRef.current || !containerRef.current) return;

        const config: Phaser.Types.Core.GameConfig = {
            ...GAME_CONFIG,
            parent: containerRef.current,
        };
        gameRef.current = new Phaser.Game(config);
        (window as any).__phaserGame = gameRef.current;

        // Bridge: store React callbacks in Phaser registry
        const game = gameRef.current;
        game.registry.set('react_updateScore', updateScore);
        game.registry.set('react_updateLives', updateLives);
        game.registry.set('react_toggleShop', toggleShop);
        game.registry.set('react_setGameOver', setGameOver);
        game.registry.set('react_setVictory', setVictory);
        game.registry.set('react_revive', revive);
        game.registry.set('react_resetGame', resetGame);
        game.registry.set('react_updateWeapon', setWeapon);
        game.registry.set('react_setScene', setScene);

        // Seed initial values
        game.registry.set('lives', 3);
        game.registry.set('score', 0);
        game.registry.set('weapon', 'NORMAL');

        return () => {
            (window as any).__phaserGame = null;
            gameRef.current?.destroy(true);
            gameRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep callbacks fresh (they're stable useCallbacks, but guard just in case)
    useEffect(() => {
        const game = gameRef.current;
        if (!game) return;
        game.registry.set('react_updateScore', updateScore);
        game.registry.set('react_updateLives', updateLives);
        game.registry.set('react_toggleShop', toggleShop);
        game.registry.set('react_setGameOver', setGameOver);
        game.registry.set('react_setVictory', setVictory);
        game.registry.set('react_revive', revive);
        game.registry.set('react_resetGame', resetGame);
        game.registry.set('react_updateWeapon', setWeapon);
        game.registry.set('react_setScene', setScene);
    }, [updateScore, updateLives, toggleShop, setGameOver, setVictory, revive, resetGame, setWeapon, setScene]);

    // Sync React state → Phaser registry so Phaser can read values synchronously
    useEffect(() => {
        const game = gameRef.current;
        if (!game) return;
        game.registry.set('lives', state.lives);
        game.registry.set('score', state.score);
        game.registry.set('isGameOver', state.isGameOver);
        game.registry.set('isShopOpen', state.isShopOpen);
        game.registry.set('weapon', state.weapon);
    }, [state.lives, state.score, state.isGameOver, state.isShopOpen, state.weapon]);

    return <div ref={containerRef} className="w-full h-full bg-black" />;
};

export default GameView;
