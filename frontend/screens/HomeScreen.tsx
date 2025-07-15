import React from 'react';
import { View, Text } from 'react-native';
import PortfolioCard from '../components/PortfolioCard';

export default function PortfolioScreen({ route }: any) {
  const { address } = route.params;

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>Wallet Overview</Text>
      <PortfolioCard address={address} />
    </View>
  );
}
