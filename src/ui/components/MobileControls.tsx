import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';

// Touch controls for mobile. Rendered as a fixed, full-screen overlay (NOT inside
// the scaled game overlay) so the buttons are always real device-size and pinned
// to the actual screen edges. Talks to the Phaser scene via window CustomEvents:
//   game_move {x,y}  — joystick direction (-1..1), x drives run, y drives aim/prone
//   game_jump        — edge-triggered (tap; tap twice for a double jump)
//   game_fire_down / game_fire_up — HELD fire (hold the button to auto-fire)
const emit = (name: string, detail?: unknown) =>
    window.dispatchEvent(detail === undefined ? new Event(name) : new CustomEvent(name, { detail }));

// setPointerCapture can throw (stale pointer); never let it abort the handler.
const capture = (el: HTMLElement, id: number) => { try { el.setPointerCapture(id); } catch { /* ignore */ } };

const TRAVEL = 56;   // joystick thumb travel radius in px
const DEAD = 0.22;   // dead zone (fraction of travel) before movement registers

export const MobileControls: React.FC = () => {
    const { state } = useGame();
    const [isTouch, setIsTouch] = useState(false);
    const [thumb, setThumb] = useState({ x: 0, y: 0 });
    const baseRef = useRef<HTMLDivElement>(null);
    const dragId = useRef<number | null>(null);

    // Only show on touch devices — on desktop the keyboard is used.
    useEffect(() => {
        const mq = window.matchMedia('(pointer: coarse)');
        const update = () => setIsTouch(mq.matches);
        update();
        mq.addEventListener?.('change', update);
        return () => mq.removeEventListener?.('change', update);
    }, []);

    // Safety: if the controls unmount mid-press (shop opens, game over), release
    // fire and movement so they don't get stuck on.
    useEffect(() => () => { emit('game_fire_up'); emit('game_move', { x: 0, y: 0 }); }, []);

    if (!isTouch || state.isShopOpen || state.isGameOver) return null;

    const updateStick = (clientX: number, clientY: number) => {
        const base = baseRef.current;
        if (!base) return;
        const r = base.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = clientX - cx, dy = clientY - cy;
        const mag = Math.hypot(dx, dy) || 1;
        const reach = Math.min(mag, TRAVEL);
        const ux = dx / mag, uy = dy / mag;
        setThumb({ x: ux * reach, y: uy * reach });
        let dirX = ux * (reach / TRAVEL);
        let dirY = uy * (reach / TRAVEL);
        if (Math.hypot(dirX, dirY) < DEAD) { dirX = 0; dirY = 0; }
        emit('game_move', { x: dirX, y: dirY });
    };

    const releaseStick = () => {
        dragId.current = null;
        setThumb({ x: 0, y: 0 });
        emit('game_move', { x: 0, y: 0 });
    };

    return (
        <div className="fixed inset-0 z-30 pointer-events-none select-none" style={{ touchAction: 'none' }}>
            {/* Left: virtual joystick */}
            <div
                ref={baseRef}
                data-testid="joystick"
                className="absolute bottom-6 left-6 w-36 h-36 rounded-full bg-white/5 border-2 border-neon-blue/25 pointer-events-auto flex items-center justify-center"
                style={{ touchAction: 'none' }}
                onPointerDown={(e) => {
                    capture(e.currentTarget as HTMLElement, e.pointerId);
                    dragId.current = e.pointerId;
                    updateStick(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => { if (dragId.current === e.pointerId) updateStick(e.clientX, e.clientY); }}
                onPointerUp={(e) => { if (dragId.current === e.pointerId) releaseStick(); }}
                onPointerCancel={() => releaseStick()}
                onLostPointerCapture={() => releaseStick()}
            >
                <div
                    className="w-16 h-16 rounded-full bg-neon-blue/30 border-2 border-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.4)]"
                    style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)` }}
                />
            </div>

            {/* Right: action buttons */}
            <div className="absolute bottom-6 right-6 flex items-end gap-5 pointer-events-auto" style={{ touchAction: 'none' }}>
                <button
                    className="w-20 h-20 rounded-full bg-neon-green/20 border-4 border-neon-green text-neon-green font-retro text-[10px] flex items-center justify-center active:scale-95 active:bg-neon-green active:text-black transition-all shadow-[0_0_20px_rgba(0,255,0,0.3)]"
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => { e.preventDefault(); emit('game_jump'); }}
                >
                    JUMP
                </button>
                <button
                    className="w-24 h-24 rounded-full bg-neon-purple/20 border-4 border-neon-purple text-neon-purple font-retro text-[10px] flex items-center justify-center active:scale-95 active:bg-neon-purple active:text-black transition-all shadow-[0_0_20px_rgba(188,19,254,0.3)]"
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => { capture(e.currentTarget as HTMLElement, e.pointerId); emit('game_fire_down'); }}
                    onPointerUp={() => emit('game_fire_up')}
                    onPointerCancel={() => emit('game_fire_up')}
                    onLostPointerCapture={() => emit('game_fire_up')}
                >
                    FIRE
                </button>
            </div>
        </div>
    );
};
