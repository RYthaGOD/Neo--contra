// ─── Solana payments (native SOL only) ──────────────────────────────────────
// Treasury wallet that receives SOL for shop purchases / continues. Leave it
// blank (or a "Replace…" placeholder) for DEV mode: items are granted free and
// no wallet/payment is required.
export const DEV_WALLET = import.meta.env.VITE_DEV_WALLET;

// Currency shown throughout the UI. All prices are in native SOL.
export const CURRENCY = 'SOL';

// Solana network (for explorer links etc.).
export const SOLANA_NETWORK = (import.meta.env.VITE_SOLANA_NETWORK as string) || 'devnet';

// Shop / continue prices, in SOL.
export const PRICES = {
    EXTRA_LIFE: 0.01,
    MINTING_GUN: 0.02,
    SOLANA_SPREAD: 0.03,
    LAYER_ZERO_LASER: 0.05,
    FIREDANCER_FIRE: 0.02,
    BLOCK_BARRIER: 0.05,
    GENESIS_BEAM: 0.08, // top-tier gun — the priciest item in the Armory
    REVIVE: 0.02,       // pay-to-continue after a game over
    SKIN: 0.01,         // one-time unlock per cosmetic skin
};

// Weapon identifiers. Mirrors classic Contra power-up letters.
//  NORMAL = default rifle, M = machine gun, S = spread, L = laser, F = fire,
//  B = barrier, G = GENESIS (premium top-tier weapon)
export type WeaponType = 'NORMAL' | 'M' | 'S' | 'L' | 'F' | 'B' | 'G';

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
    // Premium buy: rapid, piercing, 3-way — the strongest gun in the game.
    G:      { label: 'GENESIS', color: 0xffe14a, fireInterval: 110, speed: 1100, pierce: true,  spread: 3, autofire: true },
};

// Power-up letters that can drop from pods (B handled as a timed shield)
export const POWERUP_LETTERS: WeaponType[] = ['M', 'S', 'L', 'F', 'B'];

// ─── Player skins ───────────────────────────────────────────────────────────
// DEFAULT is the free standard soldier; the rest are cosmetic recolors bought
// once with SOL in the Armory (the unlock persists in localStorage). The ids
// double as the texture-key prefix (lowercased) in TextureFactory and the
// registry value Phaser reads.
export type SkinId = 'DEFAULT' | 'GOLD' | 'SOLANA' | 'DIAMOND';

export interface SkinMeta {
    id: SkinId;
    name: string;
    icon: string;
    blurb: string;
    color: string; // CSS hex for the Armory card accent
    price: number; // SOL to unlock; 0 = free
}

export const SKINS: SkinMeta[] = [
    { id: 'DEFAULT', name: 'RECRUIT',       icon: '🪖', blurb: 'STANDARD ISSUE',       color: '#2ce8a0', price: 0 },
    { id: 'GOLD',    name: 'GOLD WHALE',    icon: '🐋', blurb: 'MOLTEN-GOLD PLATING',  color: '#ffcf3f', price: PRICES.SKIN },
    { id: 'SOLANA',  name: 'VALIDATOR',     icon: '◎',  blurb: 'SOLANA NODE ARMOR',    color: '#9945ff', price: PRICES.SKIN },
    { id: 'DIAMOND', name: 'DIAMOND HANDS', icon: '💎', blurb: 'NEVER SELLING',        color: '#7fefff', price: PRICES.SKIN },
];
