import React, { useEffect, useState } from 'react';
import { Text, View, ActivityIndicator, StyleSheet, FlatList } from 'react-native';
import { API_URL } from '../Api.jsx';
export default function PortfolioCard({ address }: { address: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWalletPortfolio = async () => {
      try {
        const res = await fetch(`${API_URL}/wallet/info?address=${address}`);
if (!res.ok) {
  const text = await res.text(); // log raw HTML/error
  throw new Error(`API error ${res.status}: ${text}`);
}

const result = await res.json();
console.log("Wallet API result:", result);

        setData({
          total_usd: result.usd_value.ETH + result.usd_value.USDC + result.usd_value.LINK,
          tokens: [
            { symbol: 'SepoliaETH', balance: result.balances.ETH, usd_value: result.usd_value.ETH },
            { symbol: 'LINK', balance: result.balances.LINK, usd_value: result.usd_value.LINK },
            { symbol: 'USDC', balance: result.balances.USDC, usd_value: result.usd_value.USDC },
          ],
          history: [], // Placeholder, to be populated by backend later
        });
      } catch (err) {
        console.error("Failed to fetch wallet portfolio:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletPortfolio();
  }, [address]);

  if (loading) return <ActivityIndicator size="large" />;

  if (!data) return <Text style={styles.errorText}>Error loading wallet portfolio.</Text>;

  return (
    <View style={styles.card}>
      <Text style={styles.totalUsd}>${data.total_usd.toFixed(2)} USD <Text style={styles.change}>+$0 (+0.00%)</Text></Text>
      <Text style={styles.discover}>Discover</Text>
      <View style={styles.tokensSection}>
        <Text style={styles.sectionTitle}>Tokens</Text>
        <FlatList
          data={data.tokens}
          keyExtractor={(item) => item.symbol}
          renderItem={({ item }) => (
            <View style={styles.tokenItem}>
              <Text style={styles.tokenSymbol}>{item.symbol}</Text>
              <Text style={styles.tokenBalance}>
                {item.balance} {item.symbol}
              </Text>
              <Text style={styles.tokenUsd}>${item.usd_value.toFixed(2)}</Text>
            </View>
          )}
          ListHeaderComponent={<Text style={styles.network}>Sepolia</Text>}
        />
      </View>
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>History</Text>
        {data.history.length === 0 ? (
          <Text style={styles.noHistory}>No history available</Text>
        ) : (
          <FlatList
            data={data.history}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => <Text>{JSON.stringify(item)}</Text>}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
  },
  totalUsd: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  change: {
    fontSize: 14,
    color: '#00ff00',
  },
  discover: {
    fontSize: 14,
    color: '#1e90ff',
    marginBottom: 16,
  },
  tokensSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  network: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  tokenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tokenSymbol: {
    fontSize: 14,
    color: '#fff',
  },
  tokenBalance: {
    fontSize: 14,
    color: '#fff',
  },
  tokenUsd: {
    fontSize: 14,
    color: '#fff',
  },
  historySection: {
    marginTop: 16,
  },
  noHistory: {
    fontSize: 14,
    color: '#888',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
  },
});