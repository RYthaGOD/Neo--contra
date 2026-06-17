import React, { useState, useEffect } from 'react';
import {
    PRICES, DEV_WALLET, WeaponType, CURRENCY,
    TOKEN_MINT, TOKEN_DECIMALS, TOKEN_SYMBOL, HOLDER_MIN, SOLANA_NETWORK, tokenPrice,
    SKINS,
} from '../../config/constants';
import { useGame } from '../../context/GameContext';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { buyItem } from '../../solana/TransactionLogic';
import { getTokenBalance, burnTokens } from '../../solana/token';
import { Loader2, CheckCircle, XCircle, Flame, Lock } from 'lucide-react';

interface ShopEntry { id: string; name: string; icon: string; stat: string; price: number; color: string; holder?: boolean; }
const ITEMS: ShopEntry[] = [
    { id: 'Extra Life', name: 'EXTRA LIFE',    icon: '❤️', stat: 'RESPAWN +1',          price: PRICES.EXTRA_LIFE,       color: '#00ff7b' },
    { id: 'M',          name: 'MINTING GUN',   icon: '🔫', stat: 'RAPID FIRE · AMMO ∞',  price: PRICES.MINTING_GUN,      color: '#ffd23f' },
    { id: 'S',          name: 'SOLANA SPREAD', icon: '✴️', stat: '5-WAY BURST',          price: PRICES.SOLANA_SPREAD,    color: '#ff2d95' },
    { id: 'L',          name: 'LAYER-0 LASER', icon: '⚡', stat: 'PIERCING · DMG ×2',    price: PRICES.LAYER_ZERO_LASER, color: '#00f3ff' },
    { id: 'F',          name: 'FIREDANCER',    icon: '🔥', stat: 'WAVY FLAME',           price: PRICES.FIREDANCER_FIRE,  color: '#ff8a1e' },
    { id: 'B',          name: 'BLOCK BARRIER', icon: '🛡️', stat: 'SHIELD · 9 SEC',       price: PRICES.BLOCK_BARRIER,    color: '#56c2ff' },
    { id: 'G',          name: 'GENESIS BEAM',  icon: '💎', stat: 'HOLDERS ONLY · RAPID PIERCE ×3', price: 0, color: '#ffe14a', holder: true },
];

const explorerTx = (sig: string) =>
    `https://explorer.solana.com/tx/${sig}${SOLANA_NETWORK === 'mainnet-beta' ? '' : `?cluster=${SOLANA_NETWORK}`}`;

export const ShopUI: React.FC = () => {
    const { state, toggleShop, updateLives, setWeapon, setSkin } = useGame();
    const { connection } = useConnection();
    const wallet = useWallet();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [txSig, setTxSig] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [solBalance, setSolBalance] = useState<number | null>(null);
    const [tokenBal, setTokenBal] = useState(0);

    const tokenEnabled = !!TOKEN_MINT;
    const isHolder = tokenEnabled && tokenBal >= HOLDER_MIN;
    const devMode = !DEV_WALLET || DEV_WALLET.startsWith('Replace');

    useEffect(() => {
        if (!wallet.publicKey) { setSolBalance(null); setTokenBal(0); return; }
        connection.getBalance(wallet.publicKey).then(b => setSolBalance(b / LAMPORTS_PER_SOL)).catch(() => setSolBalance(null));
        if (tokenEnabled) {
            getTokenBalance(connection, wallet.publicKey, TOKEN_MINT, TOKEN_DECIMALS).then(setTokenBal).catch(() => setTokenBal(0));
        }
    }, [wallet.publicKey, connection, status, tokenEnabled]);

    const applyItem = (id: string) => {
        if (id === 'Extra Life') updateLives(1);
        else setWeapon(id as WeaponType);
        (window as any).__phaserGame?.registry?.set('weapon', id === 'Extra Life' ? 'NORMAL' : id);
    };

    // Pay with SOL (or free in dev mode).
    const buyWithSol = async (id: string, price: number) => {
        if (devMode) { applyItem(id); setStatus('success'); return; }
        if (!wallet.publicKey) { alert('Connect your Solana wallet first!'); return; }
        setStatus('loading');
        try {
            const sig = await buyItem(connection, wallet as any, DEV_WALLET, price);
            setTxSig(sig); applyItem(id); setStatus('success');
        } catch (err: any) {
            setErrorMsg(err?.message ?? 'Transaction failed'); setStatus('error');
        }
    };

    // Pay with $CONTRA at a 20% discount — burns the tokens from the buyer.
    const buyWithToken = async (id: string, solPrice: number) => {
        if (!wallet.publicKey) { alert('Connect your Solana wallet first!'); return; }
        const amount = tokenPrice(solPrice);
        setStatus('loading');
        try {
            const sig = await burnTokens(connection, wallet as any, TOKEN_MINT, amount, TOKEN_DECIMALS);
            setTxSig(sig); applyItem(id); setStatus('success');
        } catch (err: any) {
            setErrorMsg(err?.message ?? 'Token burn failed'); setStatus('error');
        }
    };

    // Holder-only weapon: free claim if you hold the token.
    const claimHolderWeapon = (id: string) => {
        if (!isHolder) return;
        applyItem(id); setStatus('success');
    };

    // Holder skins unlock alongside the holder weapon; devMode previews them too.
    const skinsUnlocked = isHolder || devMode;
    const selectSkin = (skin: typeof SKINS[number]) => {
        if (skin.holder && !skinsUnlocked) return;
        setSkin(skin.id);
        // Push straight to Phaser so the swap is instant when the shop closes.
        (window as any).__phaserGame?.registry?.set('skin', skin.id);
    };

    const close = () => { toggleShop(false); setStatus('idle'); };

    return (
        <div className="absolute inset-0 bg-black/92 flex items-center justify-center p-4 z-[100] backdrop-blur-sm pointer-events-auto">
            <div className="bg-black border-4 border-neon-purple p-6 w-full max-w-xl shadow-[0_0_50px_rgba(188,19,254,0.5)] relative max-h-[560px] overflow-y-auto">
                <div className="absolute inset-0 pointer-events-none opacity-10
                    bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[size:100%_4px]" />

                <div className="relative z-10 mb-5 flex items-center justify-between border-b-2 border-neon-purple/50 pb-3">
                    <h2 className="text-lg text-neon-purple font-retro uppercase tracking-widest drop-shadow-[0_0_6px_rgba(188,19,254,0.8)]">
                        ⚙ ARMORY
                    </h2>
                    <span className="text-[8px] font-retro text-neon-blue border border-neon-blue/60 px-2 py-1 bg-neon-blue/10">
                        {CURRENCY}{tokenEnabled ? ` · ${TOKEN_SYMBOL}` : ''} STORE
                    </span>
                </div>
                <div className="relative z-10 -mt-3 mb-4 text-[9px] font-retro text-neon-green">
                    PLAYER: {wallet.publicKey ? `${(solBalance ?? 0).toFixed(3)} ${CURRENCY}` : (devMode ? '∞ (DEV)' : 'CONNECT WALLET')}
                    {tokenEnabled && wallet.publicKey && (
                        <span className="text-neon-purple"> · {tokenBal.toLocaleString()} {TOKEN_SYMBOL}{isHolder ? ' ✦' : ''}</span>
                    )}
                </div>

                {status === 'loading' && (
                    <div className="flex flex-col items-center py-10 gap-4 relative z-10">
                        <Loader2 className="w-10 h-10 text-neon-purple animate-spin" />
                        <div className="text-neon-purple text-xs font-retro animate-pulse">AUTHORIZING TX...</div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center py-10 gap-4 relative z-10 text-center">
                        <CheckCircle className="w-14 h-14 text-neon-green" />
                        <div className="text-neon-green font-retro text-sm uppercase">ACQUIRED!</div>
                        {txSig && (
                            <a href={explorerTx(txSig)} target="_blank" rel="noreferrer"
                               className="text-[8px] font-retro text-neon-blue underline break-all">
                                VERIFY ON-CHAIN
                            </a>
                        )}
                        <button onClick={() => { setStatus('idle'); setTxSig(null); }}
                            className="mt-2 px-6 py-2 bg-neon-green text-black font-retro text-xs uppercase">NEXT</button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center py-10 gap-4 relative z-10 text-center">
                        <XCircle className="w-14 h-14 text-red-500" />
                        <div className="text-red-400 font-retro text-xs break-words max-w-sm">{errorMsg}</div>
                        <button onClick={() => setStatus('idle')}
                            className="mt-2 px-6 py-2 border border-neon-green text-neon-green font-retro text-xs uppercase">RETRY</button>
                    </div>
                )}

                {status === 'idle' && (
                    <>
                        <div className="grid grid-cols-2 gap-3 relative z-10 max-h-[220px] overflow-y-auto pr-1">
                            {ITEMS.map((item, i) => (
                                <ShopItem
                                    key={item.id} index={i + 1} entry={item}
                                    tokenEnabled={tokenEnabled} isHolder={isHolder}
                                    walletConnected={!!wallet.publicKey} tokenBal={tokenBal}
                                    onBuySol={() => buyWithSol(item.id, item.price)}
                                    onBuyToken={() => buyWithToken(item.id, item.price)}
                                    onClaim={() => claimHolderWeapon(item.id)}
                                />
                            ))}
                        </div>

                        {/* Holder skins — cosmetic player recolors, persist across runs */}
                        <div className="relative z-10 mt-4 border-t border-neon-purple/30 pt-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-retro text-[9px] uppercase text-neon-purple tracking-widest drop-shadow-[0_0_4px_rgba(188,19,254,0.6)]">
                                    ◈ HOLDER SKINS
                                </span>
                                {!skinsUnlocked && (
                                    <span className="flex items-center gap-1 text-[7px] font-retro text-gray-500 uppercase">
                                        <Lock className="w-2.5 h-2.5" /> HOLD {TOKEN_SYMBOL}
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {SKINS.map(skin => {
                                    const equipped = state.skin === skin.id;
                                    const locked = skin.holder && !skinsUnlocked;
                                    return (
                                        <button key={skin.id} disabled={locked}
                                            onClick={() => selectSkin(skin)}
                                            title={locked ? `Hold ${TOKEN_SYMBOL} to unlock` : skin.blurb}
                                            className={`relative flex flex-col items-center gap-1 p-2 border-2 transition-all ${locked ? 'opacity-40 cursor-not-allowed' : 'active:scale-95 hover:bg-white/5'}`}
                                            style={{
                                                borderColor: equipped ? skin.color : `${skin.color}55`,
                                                boxShadow: equipped ? `0 0 12px ${skin.color}66, inset 0 0 10px ${skin.color}22` : 'none',
                                            }}>
                                            <span className="text-xl leading-none drop-shadow-[0_0_4px_rgba(255,255,255,0.35)]">{skin.icon}</span>
                                            <span className="font-retro text-[6px] uppercase text-center leading-tight" style={{ color: skin.color }}>{skin.name}</span>
                                            {equipped ? (
                                                <span className="font-retro text-[6px] text-black px-1" style={{ backgroundColor: skin.color }}>EQUIP</span>
                                            ) : locked ? (
                                                <Lock className="w-2.5 h-2.5 text-gray-500" />
                                            ) : (
                                                <span className="font-retro text-[6px] text-neon-green uppercase">SELECT</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="relative z-10 mt-4 flex items-center justify-between text-[7px] font-retro text-neon-blue/70 border-t border-neon-purple/30 pt-3">
                            <span>{tokenEnabled ? `PAY WITH ${TOKEN_SYMBOL} = −20% · BURNED 🔥` : '▲▼ SELECT'}</span>
                            <button onClick={close}
                                className="text-neon-green border border-neon-green/70 px-3 py-1.5 uppercase hover:bg-neon-green hover:text-black transition-all">
                                ← EXIT [ESC]
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

interface ItemProps {
    index: number; entry: ShopEntry; tokenEnabled: boolean; isHolder: boolean;
    walletConnected: boolean; tokenBal: number;
    onBuySol: () => void; onBuyToken: () => void; onClaim: () => void;
}

const ShopItem: React.FC<ItemProps> = ({ index, entry, tokenEnabled, isHolder, walletConnected, tokenBal, onBuySol, onBuyToken, onClaim }) => {
    const tokenAmt = tokenPrice(entry.price);
    const canPayToken = walletConnected && tokenBal >= tokenAmt;

    return (
        <div className="relative border-2 p-3 bg-black/60 hover:bg-white/5 transition-all"
            style={{ borderColor: entry.color, boxShadow: `inset 0 0 12px ${entry.color}22` }}>
            <span className="absolute -top-2 -left-2 w-5 h-5 flex items-center justify-center bg-black border font-retro text-[8px]"
                style={{ borderColor: entry.color, color: entry.color }}>{entry.holder ? '★' : index}</span>
            <div className="flex gap-2 items-start">
                <div className="text-2xl leading-none drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]">{entry.icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="font-retro text-[9px] uppercase truncate" style={{ color: entry.color }}>{entry.name}</div>
                    <div className="text-gray-400 text-[7px] font-retro mt-1 leading-relaxed">{entry.stat}</div>
                </div>
            </div>

            {entry.holder ? (
                // Holder-only weapon: free claim for holders, locked otherwise.
                isHolder ? (
                    <button onClick={onClaim}
                        className="mt-2 w-full px-2 py-1 font-retro text-[8px] uppercase text-black active:scale-95 transition-transform"
                        style={{ backgroundColor: entry.color }}>
                        CLAIM — HOLDER PERK
                    </button>
                ) : (
                    <div className="mt-2 flex items-center justify-center gap-1 px-2 py-1 border border-white/15 text-gray-500 font-retro text-[7px] uppercase">
                        <Lock className="w-2.5 h-2.5" /> HOLD {TOKEN_SYMBOL} TO UNLOCK
                    </div>
                )
            ) : (
                <div className="mt-2 flex items-center gap-1.5">
                    <button onClick={onBuySol}
                        className="flex-1 px-2 py-1 font-retro text-[8px] uppercase text-black active:scale-95 transition-transform"
                        style={{ backgroundColor: entry.color }}>
                        {entry.price} {CURRENCY}
                    </button>
                    {tokenEnabled && (
                        <button onClick={onBuyToken} disabled={!canPayToken} title={canPayToken ? `Burn ${tokenAmt.toLocaleString()} ${TOKEN_SYMBOL}` : `Need ${tokenAmt.toLocaleString()} ${TOKEN_SYMBOL}`}
                            className="flex-1 px-2 py-1 font-retro text-[7px] uppercase flex items-center justify-center gap-1 border border-neon-purple/70 text-neon-purple hover:bg-neon-purple hover:text-black disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-neon-purple transition-all">
                            <Flame className="w-2.5 h-2.5" /> {tokenAmt.toLocaleString()} −20%
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
