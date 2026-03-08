import React, { useState } from 'react';
import { PRICES, DEV_WALLET, WeaponType } from '../../config/constants';
import { useGame } from '../../context/GameContext';
import { useSKR } from '../../hooks/useSKR';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { buyItem } from '../../solana/TransactionLogic';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export const ShopUI: React.FC = () => {
    const { toggleShop, updateLives, setWeapon } = useGame();
    const { refresh } = useSKR();
    const { connection } = useConnection();
    const wallet = useWallet();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [txSig, setTxSig] = useState<string | null>(null);

    const handlePurchase = async (name: string, price: number) => {
        if (!wallet.publicKey) return alert('Connect wallet first!');

        setStatus('loading');
        try {
            const sig = await buyItem(connection, wallet as any, DEV_WALLET, price);
            setTxSig(sig);
            setStatus('success');

            // Apply game effects
            if (name === 'Extra Life') {
                updateLives(1);
            } else {
                setWeapon(name as WeaponType);
            }

            refresh(); // Update SKR balance
        } catch (err) {
            console.error(err);
            setStatus('error');
        }
    };

    return (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
            <div className="bg-black border-4 border-neon-purple p-8 w-full max-w-2xl shadow-[0_0_50px_rgba(188,19,254,0.5)] relative overflow-hidden">
                {/* Scanline Effect */}
                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

                <h2 className="text-3xl text-neon-purple mb-8 text-center uppercase tracking-[0.2em] font-black italic">
                    Digital Armory
                </h2>

                {status === 'loading' ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-4">
                        <Loader2 className="w-12 h-12 text-neon-purple animate-spin" />
                        <div className="text-neon-purple animate-pulse">AUTHORIZING TRANSACTION...</div>
                    </div>
                ) : status === 'success' ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                        <CheckCircle className="w-16 h-16 text-neon-green" />
                        <div className="text-neon-green text-xl font-bold uppercase">Purchase Complete!</div>
                        <a
                            href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                            target="_blank"
                            className="text-[10px] text-neon-blue underline break-all"
                        >
                            Verify on Explorer
                        </a>
                        <button
                            onClick={() => setStatus('idle')}
                            className="mt-4 px-6 py-2 bg-neon-green text-black font-bold uppercase"
                        >
                            Next Item
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-4 relative z-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            <ShopItem name="Extra Life" price={PRICES.EXTRA_LIFE} onBuy={() => handlePurchase('Extra Life', PRICES.EXTRA_LIFE)} />
                            <ShopItem name="Minting Gun (M)" price={PRICES.MINTING_GUN} onBuy={() => handlePurchase('M', PRICES.MINTING_GUN)} />
                            <ShopItem name="Solana Spread (S)" price={PRICES.SOLANA_SPREAD} onBuy={() => handlePurchase('S', PRICES.SOLANA_SPREAD)} />
                            <ShopItem name="Layer-Zero Laser (L)" price={PRICES.LAYER_ZERO_LASER} onBuy={() => handlePurchase('L', PRICES.LAYER_ZERO_LASER)} />
                            <ShopItem name="Firedancer Fire (F)" price={PRICES.FIREDANCER_FIRE} onBuy={() => handlePurchase('F', PRICES.FIREDANCER_FIRE)} />
                            <ShopItem name="Block Barrier (B)" price={PRICES.BLOCK_BARRIER} onBuy={() => handlePurchase('B', PRICES.BLOCK_BARRIER)} />
                        </div>

                        <button
                            onClick={() => toggleShop(false)}
                            className="mt-12 w-full py-3 border-2 border-neon-green text-neon-green uppercase text-sm font-bold hover:bg-neon-green text-black transition-all shadow-[0_0_15px_rgba(0,255,0,0.2)]"
                        >
                            Back to Mission [ESC]
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

const ShopItem = ({ name, price, onBuy }: { name: string; price: number; onBuy: () => void }) => (
    <div className="border border-neon-blue/30 p-6 flex flex-col items-center gap-4 group hover:border-neon-blue hover:bg-neon-blue/10 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,243,255,0.05)]">
        <div className="text-xs text-neon-blue uppercase tracking-widest font-bold">{name}</div>
        <div className="text-xl text-white font-black">{price} SKR</div>
        <button
            onClick={onBuy}
            className="w-full py-2 bg-neon-purple text-black text-[10px] font-black uppercase active:scale-95 shadow-[0_4px_0_#7a0db3] active:shadow-none active:translate-y-1 transition-all"
        >
            Initialize
        </button>
    </div>
);
