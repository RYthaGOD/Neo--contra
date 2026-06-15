import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    ComputeBudgetProgram,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';

/**
 * Executes a purchase by transferring native SOL from the player's wallet to the
 * treasury (DEV_WALLET). `amount` is in SOL.
 */
export const buyItem = async (
    connection: Connection,
    wallet: { publicKey: PublicKey; signTransaction: (tx: Transaction) => Promise<Transaction> },
    devWallet: string,
    amount: number
) => {
    if (!wallet.publicKey || !wallet.signTransaction) throw new Error('Wallet not connected');

    const destinationPubKey = new PublicKey(devWallet);
    const lamports = Math.round(amount * LAMPORTS_PER_SOL);

    // Guard against an underfunded wallet (leave headroom for the network fee).
    const balance = await connection.getBalance(wallet.publicKey);
    if (balance < lamports + 5000) throw new Error('Insufficient SOL balance');

    const transaction = new Transaction();
    // Priority fee so the tx lands during mainnet congestion.
    transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }));
    transaction.add(
        SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: destinationPubKey,
            lamports,
        })
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    const signed = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });

    return signature;
};
