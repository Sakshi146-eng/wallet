import { useState } from 'react';
import { TextInput, Button, View } from 'react-native';

export default function WalletInput({ onSubmit }: { onSubmit: (addr: string) => void }) {
  const [addr, setAddr] = useState('');
  return (
    <View>
      <TextInput placeholder="Paste wallet address" value={addr} onChangeText={setAddr} />
      <Button title="Continue" onPress={() => onSubmit(addr)} />
    </View>
  );
}
