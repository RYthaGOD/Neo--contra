import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { getAssociatedTokenAddressSync, getAccount } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { SKR_MINT } from '../config/constants';

export const useSKR = () => {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const [balance, setBalance] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);

    const fetchBalance = useCallback(async () => {
        if (!publicKey) {
            setBalance(0);
            return;
        }

        setLoading(true);
        try {
            const mintPubKey = new PublicKey(SKR_MINT);
            const ata = getAssociatedTokenAddressSync(mintPubKey, publicKey);
            const account = await getAccount(connection, ata);
            setBalance(Number(account.amount) / 1_000_000_000);
        } catch (error: any) {
            // If the account simply doesn't exist, it is 0
            if (error.name === 'TokenAccountNotFoundError') {
                setBalance(0);
            } else {
                console.error('Error fetching SKR balance:', error);
                setBalance(0);
            }
        } finally {
            setLoading(false);
        }
    }, [connection, publicKey]);

    useEffect(() => {
        fetchBalance();
        const id = setInterval(fetchBalance, 30000); // 30s refresh
        return () => clearInterval(id);
    }, [fetchBalance]);

    return { balance, loading, refresh: fetchBalance };
};
