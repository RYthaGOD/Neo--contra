// $Contra SPL-token helpers: read a wallet's balance (for holder checks) and
// BURN tokens from the buyer's wallet when they pay with the token in the store.
import { Connection, PublicKey, Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import {
    getAssociatedTokenAddress, getAccount, createBurnInstruction,
    TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';

// Minimal wallet shape (matches @solana/wallet-adapter).
interface WalletLike {
    publicKey: PublicKey | null;
    signTransaction?: (tx: Transaction) => Promise<Transaction>;
}

// Newer pump.fun mints (including $Contra) are SPL **Token-2022** tokens, while
// older ones use the legacy Token program. The token program id is a seed in the
// associated-token-address derivation, so using the wrong one yields the wrong
// ATA → "account not found" → balance reads as 0 and burns fail. Detect which
// program owns the mint once and reuse it. Cached per mint.
const programCache = new Map<string, PublicKey>();
const getMintProgramId = async (connection: Connection, mint: string): Promise<PublicKey> => {
    const cached = programCache.get(mint);
    if (cached) return cached;
    let programId = TOKEN_PROGRAM_ID;
    try {
        const info = await connection.getAccountInfo(new PublicKey(mint));
        if (info?.owner.equals(TOKEN_2022_PROGRAM_ID)) programId = TOKEN_2022_PROGRAM_ID;
    } catch { /* RPC hiccup → assume legacy */ }
    programCache.set(mint, programId);
    return programId;
};

/** Whole-token balance the owner holds of `mint` (0 if no account / on error). */
export const getTokenBalance = async (
    connection: Connection,
    owner: PublicKey,
    mint: string,
    decimals: number,
): Promise<number> => {
    try {
        const programId = await getMintProgramId(connection, mint);
        const ata = await getAssociatedTokenAddress(new PublicKey(mint), owner, false, programId);
        const acc = await getAccount(connection, ata, undefined, programId);
        return Number(acc.amount) / 10 ** decimals;
    } catch {
        return 0; // no token account yet, or RPC hiccup → treat as zero
    }
};

/** Burn `uiAmount` whole tokens from the buyer's wallet (deflationary spend).
 *  The buyer signs + pays the small SOL network fee. Returns the tx signature. */
export const burnTokens = async (
    connection: Connection,
    wallet: WalletLike,
    mint: string,
    uiAmount: number,
    decimals: number,
): Promise<string> => {
    if (!wallet.publicKey || !wallet.signTransaction) throw new Error('Wallet not connected');
    const mintPk = new PublicKey(mint);
    const programId = await getMintProgramId(connection, mint);
    const ata = await getAssociatedTokenAddress(mintPk, wallet.publicKey, false, programId);

    // Confirm the account exists and holds enough before building the tx.
    const raw = BigInt(Math.round(uiAmount * 10 ** decimals));
    let balance = 0n;
    try { balance = (await getAccount(connection, ata, undefined, programId)).amount; }
    catch { throw new Error(`No ${mint.slice(0, 4)}… token account — buy some first`); }
    if (balance < raw) throw new Error('Insufficient token balance');

    const tx = new Transaction();
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }));
    tx.add(createBurnInstruction(ata, mintPk, wallet.publicKey, raw, [], programId));

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;
    const signed = await wallet.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
    return sig;
};
