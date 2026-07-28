import React, { useEffect, useRef, useState } from 'react';
import { SolanaProvider } from './context/SolanaProvider';
import { GameProvider, useGame } from './context/GameContext';
import GameView from './ui/components/GameView';
import { HUD } from './ui/components/HUD';
import { ShopUI } from './ui/components/ShopUI';
import { LeaderboardUI } from './ui/components/LeaderboardUI';
import { MobileControls } from './ui/components/MobileControls';
import { TitleLeaderboard } from './ui/components/TitleLeaderboard';

// Scales all React overlays (HUD/shop/leaderboard/mobile) from the game's native
// 800x600 design space up to the on-screen canvas size, so the UI stays pixel-
// aligned with the game and grows with it on large/fullscreen displays.
const DESIGN_W = 800, DESIGN_H = 600;
const OverlayScaler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    useEffect(() => {
        const parent = ref.current?.parentElement;
        if (!parent) return;
        const update = () => setScale(parent.clientWidth / DESIGN_W);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(parent);
        window.addEventListener('resize', update);
        return () => { ro.disconnect(); window.removeEventListener('resize', update); };
    }, []);
    return (
        <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 pointer-events-none"
                style={{ width: DESIGN_W, height: DESIGN_H, transformOrigin: 'top left', transform: `scale(${scale})` }}>
                {children}
            </div>
        </div>
    );
};

function AppContent() {
    const { state } = useGame();

    return (
        <div className="w-screen h-screen bg-black overflow-hidden flex items-center justify-center">
            {/* CRT-framed game, sized to fill the viewport at 4:3 (see index.css) */}
            <div
                id="game-container"
                className="relative border-2 border-neon-purple shadow-[0_0_40px_rgba(188,19,254,0.4)] crt"
            >
                {/* Phaser canvas mounts here */}
                <GameView />

                {/* React overlay layers — scaled to match the game canvas */}
                <OverlayScaler>
                    <HUD />
                    {state.scene === 'title' && !state.isGameOver && <TitleLeaderboard />}
                    {state.isShopOpen && <ShopUI />}
                    {state.isGameOver && <LeaderboardUI />}
                </OverlayScaler>
            </div>

            {/* Touch controls — full-screen, real device-size (outside the scaled
                overlay so they pin to the actual screen edges on phones). */}
            <MobileControls />
        </div>
    );
}

function App() {
    return (
        <SolanaProvider>
            <GameProvider>
                <AppContent />
            </GameProvider>
        </SolanaProvider>
    );
}

export default App;
