// File: app/choose_strategy.tsx
import React from 'react';
import { View, Text, Button, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ChooseStrategyScreen() {
  const { strategies, wallet_address } = useLocalSearchParams();
  const router = useRouter();
  const parsedStrategies = JSON.parse(strategies);

  const handleChoose = async (strategy: any) => {
    const result = await fetch('http://localhost:8000/agent/choose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address,
        chosen_strategy_id: strategy.strategy_id,
      }),
    });

    const data = await result.json();
    router.push({
      pathname: '/chart',
      params: {
        applied_strategy: JSON.stringify(data.applied_strategy),
        expected_return: '12', // Example, update from backend
        sharpe_ratio: '1.4',    // Example, update from backend
      },
    });
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>
        Choose a Strategy
      </Text>
      {parsedStrategies.map((strategy: any, index: number) => (
        <View key={index} style={{ marginVertical: 10, padding: 10, borderWidth: 1, borderRadius: 10 }}>
          <Text style={{ fontWeight: 'bold' }}>{strategy.label}</Text>
          <Text>ETH: {strategy.target_allocation.ETH}%</Text>
          <Text>USDC: {strategy.target_allocation.USDC}%</Text>
          <Text>LINK: {strategy.target_allocation.LINK}%</Text>
          <Button title="Choose" onPress={() => handleChoose(strategy)} />
        </View>
      ))}
    </ScrollView>
  );
}
