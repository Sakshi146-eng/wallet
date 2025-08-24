import React from 'react';
import { View, Text } from 'react-native';
import PortfolioCard from '@/components/PortfolioCard';
import { useLocalSearchParams } from 'expo-router';
import { API_URL } from '../Api.jsx';

export default function Portfolio() {
  const { address } = useLocalSearchParams();

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>Wallet Overview</Text>
      <PortfolioCard address={address as string} />
    </View>
  );
}