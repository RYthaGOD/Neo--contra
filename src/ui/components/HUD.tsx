import React from 'react';
import { useSKR } from '../../hooks/useSKR';
import { useGame } from '../../context/GameContext';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

export const HUD: React.FC = () => {
    const { balance: skrBalance } = useSKR();
    const { state, toggleShop } = useGame();
    const { publicKey } = useWallet();
    const { connection } = useConnection();
    const [solBalance, setSolBalance] = React.useState<number>(0);

    React.useEffect(() => {
        if (!publicKey) return;
        connection.getBalance(publicKey).then((b: number) => setSolBalance(b / LAMPORTS_PER_SOL));
    }, [publicKey, connection]);

    return (
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none select-none z-10">
            <div className="space-y-2 drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]">
                <div className="text-neon-green text-lg">LIVES: {String(state.lives).padStart(2, '0')}</div>
                <div className="text-neon-green text-sm uppercase font-bold">SCORE: {String(state.score).padStart(6, '0')}</div>
                <div className="mt-4 pt-4 border-t border-neon-blue/20">
                    <div className="text-neon-blue text-[10px] uppercase">
                        SOL: {publicKey ? solBalance.toFixed(3) : 'OFFLINE'}
                    </div>
                    <div className="text-neon-blue text-[10px] uppercase">
                        SKR: {publicKey ? skrBalance.toFixed(2) : 'OFFLINE'}
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-2">
                <div className="text-neon-purple text-xs border-2 border-neon-purple p-1 px-3 uppercase bg-black/80 font-bold shadow-[0_0_10px_rgba(188,19,254,0.3)]">
                    Weapon: {state.weapon}
                </div>
                <button
                    onClick={() => toggleShop(true)}
                    className="pointer-events-auto text-[10px] bg-neon-green text-black px-2 py-1 font-bold animate-pulse hover:bg-white transition-colors"
                    id="shop-btn"
                >
                    OPEN SHOP [S]
                </button>
            </div>
        </div>
    );
};
