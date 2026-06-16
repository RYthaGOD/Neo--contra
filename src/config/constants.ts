// ─── Solana payments (native SOL only) ──────────────────────────────────────
// Treasury wallet that receives SOL for shop purchases / continues. Leave it
// blank (or a "Replace…" placeholder) for DEV mode: items are granted free and
// no wallet/payment is required.
export const DEV_WALLET = import.meta.env.VITE_DEV_WALLET;

// Currency shown throughout the UI. All prices are in native SOL.
export const CURRENCY = 'SOL';

// ─── $TOKEN (pump.fun) ──────────────────────────────────────────────────────
// Paste the token's contract address (SPL mint) here AFTER launch. While blank,
// nothing is shown; once set, a copyable "CA" bar appears in the UI. Display
// only for now — no payment/utility is wired to the token yet.
export const TOKEN_CA = (import.meta.env.VITE_TOKEN_CA ?? '').trim();
// Ticker label shown next to the CA (e.g. "$NEO"). `||` (not `??`) so a blank
// value also falls back — e.g. when a `.env` expands `$Contra` to "" via dotenv.
export const TOKEN_SYMBOL = (import.meta.env.VITE_TOKEN_SYMBOL || '$TOKEN').trim() || '$TOKEN';

// SPL mint of the token (same as the CA). Used for balance checks + burns.
export const TOKEN_MINT = TOKEN_CA;
// pump.fun tokens are 6 decimals; override via env if yours differs.
export const TOKEN_DECIMALS = Number(import.meta.env.VITE_TOKEN_DECIMALS ?? 6);
// Pay with the token for this fraction of the SOL price (0.8 = 20% off).
export const TOKEN_DISCOUNT = 0.8;
// Reference rate: how many whole tokens ≈ 1 SOL. Set/raise as the price moves
// (this is what makes the token price track SOL). Tune via VITE_TOKENS_PER_SOL.
export const TOKENS_PER_SOL = Number(import.meta.env.VITE_TOKENS_PER_SOL ?? 1_000_000);
// Minimum token balance (whole tokens) that counts as a "holder" → unlocks the
// holder-only weapon. Default: any non-zero balance.
export const HOLDER_MIN = Number(import.meta.env.VITE_HOLDER_MIN ?? 1);
// Solana network (for explorer links etc.).
export const SOLANA_NETWORK = (import.meta.env.VITE_SOLANA_NETWORK as string) || 'devnet';

// Token price (whole tokens) for a SOL-priced item, at the discount.
export const tokenPrice = (solAmount: number) => Math.max(1, Math.ceil(solAmount * TOKENS_PER_SOL * TOKEN_DISCOUNT));

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
//  NORMAL = default rifle, M = machine gun, S = spread, L = laser, F = fire,
//  B = barrier, G = GENESIS (holder-only reward weapon)
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
    // Holder-only reward: rapid, piercing, 3-way — the strongest gun in the game.
    G:      { label: 'GENESIS', color: 0xffe14a, fireInterval: 110, speed: 1100, pierce: true,  spread: 3, autofire: true },
};

// Power-up letters that can drop from pods (B handled as a timed shield)
export const POWERUP_LETTERS: WeaponType[] = ['M', 'S', 'L', 'F', 'B'];
