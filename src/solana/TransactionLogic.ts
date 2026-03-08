import {
    Connection,
    PublicKey,
    Transaction,
} from '@solana/web3.js';
import {
    createTransferInstruction,
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountInstruction,
    getAccount,
} from '@solana/spl-token';
import { SKR_MINT } from '../config/constants';

/**
 * Executes a purchase using SKR tokens.
 */
export const buyItem = async (
    connection: Connection,
    wallet: { publicKey: PublicKey; signTransaction: (tx: Transaction) => Promise<Transaction> },
    devWallet: string,
    amount: number
) => {
    if (!wallet.publicKey || !wallet.signTransaction) throw new Error('Wallet not connected');

    const mintPubKey = new PublicKey(SKR_MINT);
    const destinationPubKey = new PublicKey(devWallet);

    const fromAta = getAssociatedTokenAddressSync(mintPubKey, wallet.publicKey);
    const toAta = getAssociatedTokenAddressSync(mintPubKey, destinationPubKey);

    const transaction = new Transaction();

    // Create destination ATA if it doesn't exist
    try {
        await getAccount(connection, toAta);
    } catch (e) {
        transaction.add(
            createAssociatedTokenAccountInstruction(
                wallet.publicKey,
                toAta,
                destinationPubKey,
                mintPubKey
            )
        );
    }

    // Handle SKR transfer (assuming 9 decimals)
    const amountWithDecimals = BigInt(Math.floor(amount * 1_000_000_000));

    transaction.add(
        createTransferInstruction(
            fromAta,
            toAta,
            wallet.publicKey,
            amountWithDecimals
        )
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    const signed = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());

    // Wait for confirmation to ensure state syncs
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    });

    return signature;
};
