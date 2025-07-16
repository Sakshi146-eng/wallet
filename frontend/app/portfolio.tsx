// app/portfolio.tsx
import React from 'react';
import { View, Text } from 'react-native';
import PortfolioCard from '@/components/PortfolioCard';
import { useLocalSearchParams } from 'expo-router';

export default function portfolio() {
  const { address } = useLocalSearchParams();

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>Wallet Overview</Text>
      <PortfolioCard address={address as string} />
    </View>
  );
}
