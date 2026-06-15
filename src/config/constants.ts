// ─── Solana payments (native SOL only) ──────────────────────────────────────
// Treasury wallet that receives SOL for shop purchases / continues. Leave it
// blank (or a "Replace…" placeholder) for DEV mode: items are granted free and
// no wallet/payment is required.
export const DEV_WALLET = import.meta.env.VITE_DEV_WALLET;

// Currency shown throughout the UI. All prices are in native SOL.
export const CURRENCY = 'SOL';

// Shop / continue prices, in SOL.
export const PRICES = {
    EXTRA_LIFE: 0.01,
    MINTING_GUN: 0.02,
    SOLANA_SPREAD: 0.03,
    LAYER_ZERO_LASER: 0.05,
    FIREDANCER_FIRE: 0.02,
    BLOCK_BARRIER: 0.05,
    REVIVE: 0.02,        // pay-to-continue after a game over
};

// Weapon identifiers. Mirrors classic Contra power-up letters.
//  NORMAL = default rifle, M = machine gun, S = spread, L = laser, F = fire, B = barrier
export type WeaponType = 'NORMAL' | 'M' | 'S' | 'L' | 'F' | 'B';

export interface WeaponConfig {
    label: string;
    color: number;
    // ms between shots while the fire button is held
    fireInterval: number;
    // bullet speed (px/s)
    speed: number;
    // does it pierce enemies?
    pierce: boolean;
    // shots fired per trigger pull (spread = multiple angles)
    spread: number;
    autofire: boolean;
}

export const WEAPONS: Record<WeaponType, WeaponConfig> = {
    NORMAL: { label: 'RIFLE',   color: 0xffffaa, fireInterval: 160, speed: 720, pierce: false, spread: 1, autofire: true },
    M:      { label: 'MACHINE', color: 0xffdd44, fireInterval: 80,  speed: 760, pierce: false, spread: 1, autofire: true },
    S:      { label: 'SPREAD',  color: 0xff44ff, fireInterval: 260, speed: 560, pierce: false, spread: 5, autofire: true },
    L:      { label: 'LASER',   color: 0x66ffff, fireInterval: 220, speed: 1300, pierce: true, spread: 1, autofire: true },
    F:      { label: 'FIRE',    color: 0xff8800, fireInterval: 150, speed: 480, pierce: false, spread: 1, autofire: true },
    B:      { label: 'BARRIER', color: 0x00ffff, fireInterval: 9999, speed: 0, pierce: false, spread: 0, autofire: false },
};

// Power-up letters that can drop from pods (B handled as a timed shield)
export const POWERUP_LETTERS: WeaponType[] = ['M', 'S', 'L', 'F', 'B'];
