// $Contra SPL-token helpers: read a wallet's balance (for holder checks) and
// BURN tokens from the buyer's wallet when they pay with the token in the store.
import { Connection, PublicKey, Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, createBurnInstruction } from '@solana/spl-token';

// Minimal wallet shape (matches @solana/wallet-adapter).
interface WalletLike {
    publicKey: PublicKey | null;
    signTransaction?: (tx: Transaction) => Promise<Transaction>;
}

/** Whole-token balance the owner holds of `mint` (0 if no account / on error). */
export const getTokenBalance = async (
    connection: Connection,
    owner: PublicKey,
    mint: string,
    decimals: number,
): Promise<number> => {
    try {
        const ata = await getAssociatedTokenAddress(new PublicKey(mint), owner);
        const acc = await getAccount(connection, ata);
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
    const ata = await getAssociatedTokenAddress(mintPk, wallet.publicKey);

    // Confirm the account exists and holds enough before building the tx.
    const raw = BigInt(Math.round(uiAmount * 10 ** decimals));
    let balance = 0n;
    try { balance = (await getAccount(connection, ata)).amount; }
    catch { throw new Error(`No ${mint.slice(0, 4)}… token account — buy some first`); }
    if (balance < raw) throw new Error('Insufficient token balance');

    const tx = new Transaction();
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }));
    tx.add(createBurnInstruction(ata, mintPk, wallet.publicKey, raw));

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;
    const signed = await wallet.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
    return sig;
};
