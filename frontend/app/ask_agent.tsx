// app/ask-agent.tsx
import React, { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';

export default function ask_agent() {
  const { address } = useLocalSearchParams();
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');

  const askAgent = async () => {
    const res = await api.post('http://127.0.0.1:8000/agent/ask', {
      prompt,
      wallet_address: address,
    });
    setResponse(res.data.response);
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Ask your wallet assistant"
        value={prompt}
        onChangeText={setPrompt}
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />
      <Button title="Ask walli" onPress={askAgent} />
      {response && <Text style={{ marginTop: 20 }}>{response}</Text>}
    </View>
  );
}
