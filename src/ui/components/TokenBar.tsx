import React, { useState } from 'react';
import { TOKEN_CA, TOKEN_SYMBOL } from '../../config/constants';

// Copyable contract-address bar for the pump.fun token. Renders nothing until
// VITE_TOKEN_CA is set (post-launch), so it stays invisible before launch.
// Sits in the black letterbox below the game, at real screen scale (outside the
// OverlayScaler) so the address text is always selectable/copyable.
export const TokenBar: React.FC = () => {
    const [copied, setCopied] = useState(false);
    if (!TOKEN_CA) return null;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(TOKEN_CA);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard blocked — the address is still selectable as fallback */
        }
    };

    return (
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 flex max-w-[92vw] items-center gap-2 rounded-md border border-neon-purple/60 bg-black/85 px-3 py-1.5 font-mono text-[11px] shadow-[0_0_12px_rgba(188,19,254,0.45)]">
            <span className="font-bold text-neon-purple">{TOKEN_SYMBOL}</span>
            <span className="text-gray-500">CA</span>
            <span className="select-all truncate text-neon-green" title={TOKEN_CA}>
                {TOKEN_CA}
            </span>
            <button
                onClick={copy}
                className="shrink-0 rounded border border-neon-blue/60 px-2 py-0.5 text-neon-blue transition-colors hover:bg-neon-blue/15"
            >
                {copied ? 'COPIED' : 'COPY'}
            </button>
            <a
                href={`https://pump.fun/coin/${TOKEN_CA}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded border border-neon-green/70 bg-neon-green/15 px-2 py-0.5 font-bold text-neon-green transition-colors hover:bg-neon-green hover:text-black"
            >
                BUY
            </a>
        </div>
    );
};
