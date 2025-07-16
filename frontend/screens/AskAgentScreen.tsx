import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { api } from '../lib/api';

export default function AskAgentScreen({ route }: any) {
  const { address } = route.params;
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');

  const askAgent = async () => {
    const res = await api.post('/agent/ask', {
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
      <Button title="Ask Copilot" onPress={askAgent} />
      {response && <Text style={{ marginTop: 20 }}>{response}</Text>}
    </View>
  );
}
