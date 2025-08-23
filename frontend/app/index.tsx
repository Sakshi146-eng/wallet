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
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import {API_URL} from '../Api.jsx';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const formSlideAnim = useRef(new Animated.Value(0)).current;
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  useEffect(() => {
    // Animate form transition
    Animated.spring(formSlideAnim, {
      toValue: isSignUp ? 1 : 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [isSignUp]);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert("Please fill in all fields");
      return;
    }

    if (isSignUp && !walletAddress.trim()) {
      showAlert("Please enter your wallet address");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      showAlert("Passwords don't match");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsAuthenticated(true);
      
      // Animate to main screen - FIXED: Just set the value, don't call non-existent function
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Reset fade animation for main content
        fadeAnim.setValue(1);
      });
    }, 1500);
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setWalletAddress('');
  };

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

  const animateButtonPress = (callback) => {
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

  const showAlert = (message) => {
    Alert.alert("Wallet AI", message);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setEmail('');
    setPassword('');
    setWalletAddress('');
  };

  return (
    <View style={styles.container}>
      {/* Animated Background - FIXED: Use a placeholder or remove if image doesn't exist */}
      <View style={styles.backgroundPlaceholder} />
      
      {/* Gradient Overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'rgba(187,134,252,0.3)', 'rgba(0,0,0,0.8)']}
        style={styles.gradientOverlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Particles */}
      <FloatingParticle size={4} top={100} left={50} duration={4000} />
      <FloatingParticle size={6} top={200} right={80} duration={5000} />
      <FloatingParticle size={3} bottom={300} left={100} duration={6000} />
      <FloatingParticle size={5} bottom={150} right={60} duration={4500} />

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

        {!isAuthenticated ? (
          // Authentication Form
          <Animated.View style={[styles.authContainer, { transform: [{ scale: scaleAnim }] }]}>
            <BlurView intensity={25} style={styles.authBlur}>
              <View style={styles.authForm}>
                {/* Auth Toggle */}
                <View style={styles.authToggle}>
                  <Pressable
                    onPress={() => setIsSignUp(false)}
                    style={[styles.toggleButton, !isSignUp && styles.activeToggle]}
                  >
                    <Text style={[styles.toggleText, !isSignUp && styles.activeToggleText]}>
                      Log In
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setIsSignUp(true)}
                    style={[styles.toggleButton, isSignUp && styles.activeToggle]}
                  >
                    <Text style={[styles.toggleText, isSignUp && styles.activeToggleText]}>
                      Sign Up
                    </Text>
                  </Pressable>
                </View>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.inputWrapper}>
                    <Ionicons 
                      name="mail-outline" 
                      size={20} 
                      color={isInputFocused ? "#bb86fc" : "#888"} 
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.authInput}
                      placeholder="Email address"
                      placeholderTextColor="#888"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.inputWrapper}>
                    <Ionicons 
                      name="lock-closed-outline" 
                      size={20} 
                      color={isInputFocused ? "#bb86fc" : "#888"} 
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.authInput, { flex: 1 }]}
                      placeholder="Password"
                      placeholderTextColor="#888"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#888"
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Confirm Password (Sign Up only) */}
                {isSignUp && (
                  <Animated.View
                    style={[
                      styles.inputGroup,
                      {
                        opacity: formSlideAnim,
                        transform: [
                          {
                            translateY: formSlideAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-20, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <View style={styles.inputWrapper}>
                      <Ionicons 
                        name="lock-closed-outline" 
                        size={20} 
                        color={isInputFocused ? "#bb86fc" : "#888"} 
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.authInput}
                        placeholder="Confirm password"
                        placeholderTextColor="#888"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showPassword}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                      />
                    </View>
                  </Animated.View>
                )}

                {/* Wallet Address (Sign Up only) */}
                {isSignUp && (
                  <Animated.View
                    style={[
                      styles.inputGroup,
                      {
                        opacity: formSlideAnim,
                        transform: [
                          {
                            translateY: formSlideAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-20, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <View style={styles.inputWrapper}>
                      <Ionicons 
                        name="wallet-outline" 
                        size={20} 
                        color={isInputFocused ? "#bb86fc" : "#888"} 
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.authInput}
                        placeholder="Wallet address"
                        placeholderTextColor="#888"
                        value={walletAddress}
                        onChangeText={setWalletAddress}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                      />
                    </View>
                  </Animated.View>
                )}

                {/* Auth Button */}
                <AuthButton
                  onPress={handleAuth}
                  title={isSignUp ? "Create Account" : "Log In"}
                  isLoading={isLoading}
                />

                {/* Toggle Auth Mode */}
                <Pressable onPress={toggleAuthMode} style={styles.switchAuthMode}>
                  <Text style={styles.switchText}>
                    {isSignUp ? "Already have an account? " : "Don't have an account? "}
                    <Text style={styles.switchLink}>
                      {isSignUp ? "Log In" : "Sign Up"}
                    </Text>
                  </Text>
                </Pressable>
              </View>
            </BlurView>
          </Animated.View>
        ) : (
          // Main App Content (After Authentication)
          <>
            {/* User Info Bar */}
            <View style={styles.userBar}>
              <BlurView intensity={20} style={styles.userBarBlur}>
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    <Ionicons name="person" size={20} color="#bb86fc" />
                  </View>
                  <Text style={styles.userEmail}>{email}</Text>
                  <Pressable onPress={logout} style={styles.logoutButton}>
                    <Ionicons name="log-out-outline" size={20} color="#ff6b6b" />
                  </Pressable>
                </View>
              </BlurView>
            </View>

            {/* Wallet Address Input (if not set during signup) */}
            {!walletAddress && (
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
            )}

            {/* Current Wallet Display */}
            {walletAddress && (
              <View style={styles.walletDisplay}>
                <BlurView intensity={15} style={styles.walletDisplayBlur}>
                  <View style={styles.walletInfo}>
                    <Ionicons name="wallet" size={16} color="#bb86fc" />
                    <Text style={styles.walletText}>
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </Text>
                    <Pressable
                      onPress={() => setWalletAddress('')}
                      style={styles.editWallet}
                    >
                      <Ionicons name="pencil" size={16} color="#888" />
                    </Pressable>
                  </View>
                </BlurView>
              </View>
            )}

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
          </>
        )}
      </Animated.View>
    </View>
  );
}

// Auth Button Component
const AuthButton = ({ onPress, title, isLoading }) => {
  const buttonScale = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const loadingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Glow animation
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

    // Loading animation
    if (isLoading) {
      Animated.loop(
        Animated.timing(loadingAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      loadingAnim.setValue(0);
    }
  }, [isLoading]);

  const handlePress = () => {
    if (isLoading) return;
    
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
        style={[styles.authButton, isLoading && styles.authButtonLoading]}
        disabled={isLoading}
      >
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
        
        <BlurView intensity={40} style={styles.authButtonBlur}>
          <View style={styles.authButtonContent}>
            {isLoading ? (
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: loadingAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                }}
              >
                <Ionicons name="sync" size={20} color="#000" />
              </Animated.View>
            ) : (
              <Ionicons name="log-in" size={20} color="#000" />
            )}
            <Text style={styles.authButtonText}>
              {isLoading ? "Processing..." : title}
            </Text>
          </View>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
};

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
  // FIXED: Added background placeholder instead of potentially missing image
  backgroundPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0a',
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
  
  // Authentication Styles
  authContainer: {
    width: '100%',
    marginBottom: 40,
  },
  authBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.3)',
  },
  authForm: {
    padding: 24,
  },
  authToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeToggle: {
    backgroundColor: '#bb86fc',
  },
  toggleText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  activeToggleText: {
    color: '#000',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.2)',
  },
  inputIcon: {
    marginRight: 12,
  },
  authInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  authButton: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#bb86fc',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  authButtonLoading: {
    opacity: 0.8,
  },
  authButtonBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  authButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  authButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 12,
  },
  switchAuthMode: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#888',
    fontSize: 14,
  },
  switchLink: {
    color: '#bb86fc',
    fontWeight: '600',
  },

  // User Bar Styles
  userBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 3,
  },
  userBarBlur: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.2)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(187, 134, 252, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userEmail: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },

  // Wallet Display Styles
  walletDisplay: {
    width: '100%',
    marginBottom: 20,
  },
  walletDisplayBlur: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.2)',
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  walletText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'monospace',
    marginLeft: 8,
  },
  editWallet: {
    padding: 4,
  },

  // Input Styles
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
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 16,
  },
  inputFocused: {
    borderColor: '#bb86fc',
  },

  // Button Styles
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

  // Feature Cards
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

  // Floating Particles
  floatingParticle: {
    position: 'absolute',
    backgroundColor: 'rgba(187, 134, 252, 0.6)',
    shadowColor: '#bb86fc',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});