import React, { useEffect, useState } from 'react';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { api } from '../lib/api.ts';

export default function PortfolioCard({ address }: { address: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWalletInfo = async () => {
      try {
        const res = await api.get(`/wallet/info?address=${address}`);
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch wallet info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletInfo();
  }, [address]);

  if (loading) return <ActivityIndicator size="large" />;

  if (!data) return <Text style={styles.errorText}>Error loading wallet info.</Text>;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Wallet: {data.address}</Text>
      <Text style={styles.balance}>ETH: {data.balances.ETH}</Text>
      <Text style={styles.balance}>USDC: {data.balances.USDC}</Text>
      <Text style={styles.balance}>LINK: {data.balances.LINK}</Text>
      <Text style={styles.network}>Network: {data.network}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    marginVertical: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  balance: {
    fontSize: 14,
    marginBottom: 4,
  },
  network: {
    marginTop: 10,
    fontSize: 12,
    color: 'gray',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
  },
});
