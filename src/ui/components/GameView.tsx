import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GAME_CONFIG } from '../../game/config';
import { BootScene } from '../../game/scenes/BootScene';
import { GameScene } from '../../game/scenes/GameScene';
import { useGame } from '../../context/GameContext';

const GameView: React.FC = () => {
    const gameRef = useRef<Phaser.Game | null>(null);
    const { state, updateScore, updateLives, toggleShop, setGameOver, resetGame } = useGame();

    useEffect(() => {
        if (!gameRef.current) return;
        const game = gameRef.current;
        game.registry.set('lives', state.lives);
        game.registry.set('score', state.score);
        game.registry.set('isGameOver', state.isGameOver);
        game.registry.set('isShopOpen', state.isShopOpen);
    }, [state.lives, state.score, state.isGameOver, state.isShopOpen]);

    useEffect(() => {
        if (!gameRef.current) {
            const config: Phaser.Types.Core.GameConfig = {
                ...GAME_CONFIG,
                parent: 'game-container',
                scene: [BootScene, GameScene],
            };
            gameRef.current = new Phaser.Game(config);
        }

        // Setup Bridge Functions
        const game = gameRef.current;
        game.registry.set('react_updateScore', updateScore);
        game.registry.set('react_updateLives', updateLives);
        game.registry.set('react_toggleShop', toggleShop);
        game.registry.set('react_setGameOver', setGameOver);
        game.registry.set('react_resetGame', resetGame);

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, [updateScore, updateLives, toggleShop, setGameOver, resetGame]);

    return <div id="game-container" className="w-full h-full bg-black" />;
};

export default GameView;
