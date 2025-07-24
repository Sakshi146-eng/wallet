import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [walletAddress, setWalletAddress] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    // Enhanced entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous pulse animation for title
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const goToPortfolio = () => {
    if (!walletAddress.trim()) {
      showAlert("Please enter your wallet address");
      return;
    }
    animateButtonPress(() => {
      router.push({ pathname: '/portfolio', params: { address: walletAddress } });
    });
  };

  const goToAgent = () => {
    if (!walletAddress.trim()) {
      showAlert("Please enter your wallet address");
      return;
    }
    animateButtonPress(() => {
      router.push({ pathname: '/ask_agent', params: { address: walletAddress } });
    });
  };

  const animateButtonPress = (callback: Animated.EndCallback | undefined) => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  const showAlert = (message: string) => {
    // Custom alert implementation with animation
    console.log(message); // Replace with your preferred alert method
  };

  return (
    <View style={styles.container}>
      {/* Animated Background */}
      <Image
        source={require('../assets/images/background.jpg')} 
        style={styles.backgroundImage}
        contentFit="cover"
      />
      
      {/* Gradient Overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'rgba(187,134,252,0.3)', 'rgba(0,0,0,0.8)']}
        style={styles.gradientOverlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Particles */}
      <FloatingParticle size={4} top={100} left={50} duration={4000} bottom={undefined} right={undefined} />
      <FloatingParticle size={6} top={200} right={80} duration={5000} bottom={undefined} left={undefined} />
      <FloatingParticle size={3} bottom={300} left={100} duration={6000} top={undefined} right={undefined} />
      <FloatingParticle size={5} bottom={150} right={60} duration={4500} top={undefined} left={undefined} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Enhanced Title Section */}
        <Animated.View
          style={[
            styles.titleContainer,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <Text style={styles.title}>⚡ Wallet AI</Text>
          <View style={styles.titleUnderline} />
        </Animated.View>

        <Text style={styles.subtitle}>
          Your crypto companion, powered by AI
        </Text>

        {/* Enhanced Input Field */}
        <Animated.View style={[styles.inputContainer, { transform: [{ scale: scaleAnim }] }]}>
          <BlurView intensity={20} style={styles.inputBlur}>
            <View style={styles.inputWrapper}>
              <Ionicons 
                name="wallet-outline" 
                size={20} 
                color={isInputFocused ? "#bb86fc" : "#888"} 
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  isInputFocused && styles.inputFocused
                ]}
                placeholder="Enter wallet address..."
                placeholderTextColor="#888"
                value={walletAddress}
                onChangeText={setWalletAddress}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
              />
            </View>
          </BlurView>
        </Animated.View>

        {/* Enhanced Action Buttons */}
        <View style={styles.buttonContainer}>
          <AnimatedButton
            onPress={goToPortfolio}
            isPrimary={true}
            icon="pie-chart-outline"
            title="View Portfolio"
            description="Analyze your holdings"
          />
          
          <AnimatedButton
            onPress={goToAgent}
            isPrimary={false}
            icon="chatbubble-ellipses-outline"
            title="Ask AI Agent"
            description="Get smart insights"
          />
        </View>

        {/* Feature Cards */}
        <View style={styles.featureContainer}>
          <FeatureCard
            icon="trending-up"
            title="Real-time Tracking"
            delay={500}
          />
          <FeatureCard
            icon="shield-checkmark"
            title="Secure & Private"
            delay={700}
          />
          <FeatureCard
            icon="flash"
            title="Lightning Fast"
            delay={900}
          />
        </View>
      </Animated.View>
    </View>
  );
}

// Animated Button Component
const AnimatedButton = ({ onPress, isPrimary, icon, title, description }) => {
  const buttonScale = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPrimary) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
      <Pressable
        onPress={handlePress}
        style={[styles.actionButton, isPrimary ? styles.primaryButton : styles.secondaryButton]}
      >
        {isPrimary && (
          <Animated.View
            style={[
              styles.glowEffect,
              {
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.8],
                }),
              },
            ]}
          />
        )}
        
        <BlurView intensity={isPrimary ? 40 : 20} style={styles.buttonBlur}>
          <View style={styles.buttonContent}>
            <View style={styles.buttonIconContainer}>
              <Ionicons
                name={icon}
                size={24}
                color={isPrimary ? "#000" : "#bb86fc"}
              />
            </View>
            <View style={styles.buttonTextContainer}>
              <Text style={[styles.buttonText, isPrimary ? styles.primaryText : styles.secondaryText]}>
                {title}
              </Text>
              <Text style={[styles.buttonDescription, isPrimary ? styles.primaryDescription : styles.secondaryDescription]}>
                {description}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isPrimary ? "#000" : "#bb86fc"}
            />
          </View>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
};

// Feature Card Component
const FeatureCard = ({ icon, title, delay }) => {
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.spring(cardAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, delay);
  }, []);

  return (
    <Animated.View
      style={[
        styles.featureCard,
        {
          opacity: cardAnim,
          transform: [
            {
              translateY: cardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        },
      ]}
    >
      <BlurView intensity={30} style={styles.cardBlur}>
        <Ionicons name={icon} size={20} color="#bb86fc" />
        <Text style={styles.featureText}>{title}</Text>
      </BlurView>
    </Animated.View>
  );
};

// Floating Particle Component
const FloatingParticle = ({ size, top, bottom, left, right, duration }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: duration,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.floatingParticle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          top,
          bottom,
          left,
          right,
          transform: [
            {
              translateY: floatAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -30],
              }),
            },
            {
              rotate: floatAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }),
            },
          ],
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  content: {
    flex: 1,
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#bb86fc',
    textShadowColor: '#8f00ff',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 15,
    textAlign: 'center',
  },
  titleUnderline: {
    width: 80,
    height: 3,
    backgroundColor: '#bb86fc',
    marginTop: 8,
    borderRadius: 2,
  },
  subtitle: {
    fontSize: 18,
    color: '#dcdcdc',
    marginBottom: 40,
    textAlign: 'center',
    opacity: 0.9,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 40,
  },
  inputBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.3)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 16,
  },
  inputFocused: {
    borderColor: '#bb86fc',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 30,
  },
  actionButton: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryButton: {
    shadowColor: '#bb86fc',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.5)',
  },
  glowEffect: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#bb86fc',
    borderRadius: 16,
  },
  buttonBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  buttonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(187, 134, 252, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  buttonDescription: {
    fontSize: 14,
    opacity: 0.8,
  },
  primaryText: {
    color: '#000',
  },
  primaryDescription: {
    color: '#333',
  },
  secondaryText: {
    color: '#bb86fc',
  },
  secondaryDescription: {
    color: '#888',
  },
  featureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  featureCard: {
    flex: 1,
    marginHorizontal: 4,
  },
  cardBlur: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.2)',
  },
  featureText: {
    color: '#dcdcdc',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  floatingParticle: {
    position: 'absolute',
    backgroundColor: 'rgba(187, 134, 252, 0.6)',
    shadowColor: '#bb86fc',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
