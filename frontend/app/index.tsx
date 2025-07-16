import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';

export default function HomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [walletAddress, setWalletAddress] = useState('');

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const goToPortfolio = () => {
    if (!walletAddress) return alert("Please enter your wallet address");
    router.push({ pathname: '/portfolio', params: { address: walletAddress } });
  };

  const goToAgent = () => {
    if (!walletAddress) return alert("Please enter your wallet address");
    router.push({ pathname: '/ask_agent', params: { address: walletAddress } });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Image
        source={require('@/assets/images/background.jpg')}
        style={styles.backgroundImage}
        contentFit="cover"
      />
      <View style={styles.overlay} />

      <View style={styles.content}>
        <Text style={styles.title}>⚡ Wallet AI</Text>
        <Text style={styles.subtitle}>Your crypto companion, powered by AI</Text>

        <TextInput
          placeholder="Enter your wallet address"
          placeholderTextColor="#aaa"
          value={walletAddress}
          onChangeText={setWalletAddress}
          style={styles.input}
        />

        <Pressable style={styles.primaryButton} onPress={goToPortfolio}>
          <Text style={styles.buttonText}>View Portfolio</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={goToAgent}>
          <Text style={styles.secondaryText}>Ask AI Agent</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    opacity: 0.8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1,
  },
  content: {
    flex: 1,
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#bb86fc',
    textShadowColor: '#8f00ff',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#dcdcdc',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#bb86fc',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    width: '90%',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#bb86fc',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#bb86fc',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    borderColor: '#bb86fc',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  secondaryText: {
    color: '#bb86fc',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
