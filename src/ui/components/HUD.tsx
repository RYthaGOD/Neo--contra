import React from 'react';
import { useGame } from '../../context/GameContext';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export const HUD: React.FC = () => {
    const { state, toggleShop } = useGame();
    const { publicKey } = useWallet();
    const { connection } = useConnection();
    const [solBalance, setSolBalance] = React.useState<number>(0);

    React.useEffect(() => {
        if (!publicKey) return;
        connection.getBalance(publicKey).then(b => setSolBalance(b / LAMPORTS_PER_SOL));
    }, [publicKey, connection]);

    if (state.isGameOver || state.isShopOpen) return null;

    const hearts = Array.from({ length: 3 }, (_, i) => i < state.lives);

    return (
        <div className="absolute top-0 left-0 w-full p-3 flex justify-between items-start pointer-events-none select-none z-10">
            {/* Left: Score + Lives */}
            <div className="space-y-1.5 drop-shadow-[0_0_5px_rgba(0,255,0,0.6)]">
                <div className="text-neon-green text-xs font-retro">
                    {hearts.map((alive, i) => (
                        <span key={i} className={alive ? 'text-neon-green' : 'text-gray-700 opacity-40'}>♥ </span>
                    ))}
                </div>
                <div className="text-neon-green text-xs font-retro">
                    {String(state.score).padStart(8, '0')}
                </div>
                <div className="text-[9px] font-retro text-neon-blue/80 mt-3">
                    <div>SOL: {publicKey ? solBalance.toFixed(3) : '─'}</div>
                </div>
            </div>

            {/* Right: Weapon + Wallet + Shop */}
            <div className="flex flex-col items-end gap-2">
                <div className="pointer-events-auto">
                    <WalletMultiButton
                        style={{
                            background: 'rgba(0,0,0,0.85)',
                            border: '1px solid #bc13fe',
                            borderRadius: 0,
                            fontFamily: '"Press Start 2P", monospace',
                            fontSize: '7px',
                            padding: '4px 8px',
                            height: 'auto',
                            lineHeight: '1.4',
                            color: '#bc13fe',
                        }}
                    />
                </div>
                <div className="text-[9px] font-retro text-neon-purple border border-neon-purple px-2 py-1 bg-black/80">
                    WPN: {state.weapon}{state.weaponLevel > 1 ? ` Lv${state.weaponLevel}` : ''}
                </div>
                <button
                    onClick={() => toggleShop(true)}
                    className="pointer-events-auto text-[8px] font-retro bg-neon-green/90 text-black px-2 py-1 font-bold hover:bg-white transition-colors"
                >
                    ARMORY [ESC]
                </button>
            </div>
        </div>
    );
};
