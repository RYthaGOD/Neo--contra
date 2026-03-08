import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';

export const MobileControls: React.FC = () => {
    const { state } = useGame();
    const [touchData, setTouchData] = useState({ x: 0, y: 0, active: false });

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!touchData.active) return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;

        // Normalize and dispatch
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        const dirX = magnitude > 20 ? dx / magnitude : 0;
        const dirY = magnitude > 20 ? dy / magnitude : 0;

        window.dispatchEvent(new CustomEvent('game_move', { detail: { x: dirX, y: dirY } }));
    };

    if (state.isShopOpen) return null;

    return (
        <div className="absolute inset-0 pointer-events-none select-none z-20">
            {/* Left Side: Virtual Joystick Area */}
            <div
                className="absolute bottom-8 left-8 w-40 h-40 rounded-full bg-white/5 border-2 border-neon-blue/20 pointer-events-auto active:border-neon-blue/50 flex items-center justify-center transition-opacity"
                onPointerDown={(e) => {
                    (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
                    setTouchData(prev => ({ ...prev, active: true }));
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={() => {
                    setTouchData(prev => ({ ...prev, active: false }));
                    window.dispatchEvent(new CustomEvent('game_move', { detail: { x: 0, y: 0 } }));
                }}
            >
                <div className="w-16 h-16 rounded-full bg-neon-blue/30 border-2 border-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.4)]" />
            </div>

            {/* Right Side: Action Buttons */}
            <div className="absolute bottom-8 right-8 flex gap-6 pointer-events-auto">
                {/* Jump Button */}
                <button
                    className="w-20 h-20 rounded-full bg-neon-green/20 border-4 border-neon-green text-neon-green font-black flex items-center justify-center active:scale-95 active:bg-neon-green active:text-black transition-all shadow-[0_0_20px_rgba(0,255,0,0.3)]"
                    onPointerDown={() => {
                        // Emit Jump Event
                        window.dispatchEvent(new CustomEvent('game_jump'));
                    }}
                >
                    UP
                </button>

                {/* Fire Button */}
                <button
                    className="w-24 h-24 rounded-full bg-neon-purple/20 border-4 border-neon-purple text-neon-purple font-black flex items-center justify-center active:scale-95 active:bg-neon-purple active:text-black transition-all shadow-[0_0_20px_rgba(188,19,254,0.3)]"
                    onPointerDown={() => {
                        // Emit Fire Event
                        window.dispatchEvent(new CustomEvent('game_fire'));
                    }}
                >
                    FIRE
                </button>
            </div>
        </div>
    );
};
