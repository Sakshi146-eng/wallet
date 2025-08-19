import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// Platform-specific WebView import
let WebView;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

const { width, height } = Dimensions.get('window');

// Helper function to determine if screen is wide (tablet/desktop)
const isWideScreen = width > 768;
const isMobile = width <= 480;

export default function AskAgent() {
  const { address } = useLocalSearchParams();
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rebalanceMode, setRebalanceMode] = useState(false);
  const [showStrategiesButton, setShowStrategiesButton] = useState(false);
  const [strategiesData, setStrategiesData] = useState(null);
  
  // Animation values with platform-specific native driver
  const useNativeDriver = Platform.OS !== 'web';
  const splineOpacity = useRef(new Animated.Value(1)).current;
  const splineScale = useRef(new Animated.Value(1)).current;
  const rebalanceIconScale = useRef(new Animated.Value(1)).current;

  // Simplified: Spline visibility based only on response existence
  const shouldShowSpline = !response;

  // Enhanced content extraction for nested structure including error handling
  const extractTextContent = (data) => {
    console.log('Extracting content from:', data);
    
    if (typeof data === 'string') {
      return data;
    }
    
    if (data && typeof data === 'object') {
      if (data.response && typeof data.response === 'object') {
        // Handle error responses
        if (data.response.error && typeof data.response.error === 'string') {
          console.log('Found error response:', data.response.error);
          
          // If there's advice, include it
          if (data.response.advice && typeof data.response.advice === 'string') {
            return `⚠️ ${data.response.error}\n\n💡 ${data.response.advice}`;
          }
          
          return `⚠️ ${data.response.error}`;
        }
        
        // Handle successful content responses
        if (data.response.content && typeof data.response.content === 'string') {
          console.log('Found nested response.content:', data.response.content);
          return data.response.content;
        }
        
        if (data.response.message && typeof data.response.message === 'string') {
          return data.response.message;
        }
        
        if (data.response.text && typeof data.response.text === 'string') {
          return data.response.text;
        }
        
        // Handle advice-only responses
        if (data.response.advice && typeof data.response.advice === 'string') {
          return `💡 ${data.response.advice}`;
        }
      }
      
      // Check for direct content keys
      const contentKeys = ['content', 'message', 'text', 'answer', 'result', 'error', 'advice'];
      
      for (const key of contentKeys) {
        if (data[key] && typeof data[key] === 'string') {
          console.log(`Found content at key '${key}':`, data[key]);
          return key === 'error' ? `⚠️ ${data[key]}` : data[key];
        }
      }
      
      const availableKeys = Object.keys(data);
      console.log('No direct text content found. Available keys:', availableKeys);
      
      if (data.response) {
        const responseKeys = Object.keys(data.response);
        return `Response received but couldn't extract readable content. Available keys: ${responseKeys.join(', ')}`;
      }
      
      return `Response received but no text content found. Available keys: ${availableKeys.join(', ')}`;
    }
    
    return 'Sorry, I received an unexpected response format.';
  };

  // Animate Spline visibility with platform-specific driver
  const animateSplineVisibility = (show) => {
    Animated.parallel([
      Animated.timing(splineOpacity, {
        toValue: show ? 1 : 0,
        duration: show ? 500 : 300,
        useNativeDriver,
      }),
      Animated.spring(splineScale, {
        toValue: show ? 1 : 0.8,
        tension: 50,
        friction: 8,
        useNativeDriver,
      }),
    ]).start();
  };

  // Animate rebalance icon
  const animateRebalanceIcon = () => {
    Animated.sequence([
      Animated.timing(rebalanceIconScale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver,
      }),
      Animated.spring(rebalanceIconScale, {
        toValue: 1,
        tension: 100,
        friction: 3,
        useNativeDriver,
      }),
    ]).start();
  };

  // Toggle rebalance mode
  const toggleRebalanceMode = () => {
    animateRebalanceIcon();
    setRebalanceMode(!rebalanceMode);
    setShowStrategiesButton(false);
    setStrategiesData(null);
    
    // Clear response when switching modes
    if (response) {
      setResponse('');
      setError('');
    }
  };

  // Clear response when user types new question
  const handleQuestionChange = (text) => {
    setQuestion(text);
    
    // If there's an existing response and user types something new, clear it
    if (response && text.trim() !== '') {
      setResponse('');
      setError('');
      setShowStrategiesButton(false);
      setStrategiesData(null);
    }
  };

  const askAgent = async () => {
    if (!question.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }

    if (!address || typeof address !== 'string') {
      Alert.alert('Error', 'Invalid wallet address');
      return;
    }

    setLoading(true);
    setError('');
    setShowStrategiesButton(false);
    setStrategiesData(null);

    try {
      const requestBody = {
        prompt: question.trim(),
        wallet_address: address.toString().trim(),
      };

      console.log('Sending request:', requestBody);

      // Choose endpoint based on rebalance mode
      const endpoint = rebalanceMode ? '/agent/rebalance' : '/agent/ask';
      const result = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', result.status);

      if (!result.ok) {
        if (result.status === 422) {
          const errorData = await result.json().catch(() => ({}));
          console.log('Validation error details:', errorData);
          
          const errorMessage = errorData.detail 
            ? (Array.isArray(errorData.detail) 
                ? errorData.detail.map(err => `${err.loc?.join('.')} - ${err.msg}`).join(', ')
                : errorData.detail)
            : 'Request validation failed. Please check your input.';
          
          setError(errorMessage);
          Alert.alert('Validation Error', errorMessage);
          return;
        } else {
          throw new Error(`HTTP error! status: ${result.status}`);
        }
      }

      const data = await result.json();
      console.log('Raw response data:', JSON.stringify(data, null, 2));
      
      if (rebalanceMode && data.strategies) {
        // Handle rebalance response with strategies
        setStrategiesData(data.strategies);
        setShowStrategiesButton(true);
        
        // Generate a meaningful response based on the strategies data
        const strategiesCount = data.strategies.length;
        const totalValue = data.total_usd_value || 0;
        
        let responseText = `🎯 **Portfolio Analysis Complete**\n\n`;
        responseText += `I've analyzed your wallet and prepared **${strategiesCount} customized rebalancing strategies** for long-term passive income.\n\n`;
        
        if (totalValue > 0) {
          responseText += `📊 Current Portfolio Value: ${totalValue.toLocaleString()}\n\n`;
        }
        
        responseText += `Each strategy offers different risk-reward profiles:\n`;
        responseText += `• **Conservative**: Higher stablecoin allocation for stability\n`;
        responseText += `• **Balanced**: Mixed allocation for steady growth\n`;
        responseText += `• **Growth-Oriented**: Higher crypto allocation for maximum returns\n\n`;
        responseText += `💡 Tap "Show Portfolio Strategies" below to explore detailed allocations and choose your preferred strategy.`;
        
        setResponse(responseText);
      } else {
        // Handle normal response
        const textContent = extractTextContent(data);
        console.log('Extracted text content:', textContent);
        
        if (typeof textContent === 'string') {
          setResponse(textContent);
        } else {
          setResponse('Error: Could not extract text content from response');
        }
      }
      
    } catch (error) {
      console.error('Error asking agent:', error);
      const errorMessage = `Network error: ${error.message}`;
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const showPortfolioStrategies = () => {
    if (strategiesData && address) {
      router.push({
        pathname: '/choose_strategy',
        params: {
          strategies: JSON.stringify(strategiesData),
          wallet_address: address,
        },
      });
    } else {
      Alert.alert('Error', 'No strategies data available');
    }
  };

  const askPredefinedQuestion = (predefinedPrompt) => {
    setQuestion(predefinedPrompt);
    setResponse('');
    setError('');
    setShowStrategiesButton(false);
    setStrategiesData(null);
  };

  const startNewQuestion = () => {
    setQuestion('');
    setResponse('');
    setError('');
    setLoading(false);
    setShowStrategiesButton(false);
    setStrategiesData(null);
  };

  // Enhanced Platform-specific Spline component
  const SplineComponent =React.useMemo( () => {
    if (Platform.OS === 'web') {
      return (
        <View style={[
          styles.webSplineContainer,
          isWideScreen && styles.webSplineContainerWide,
          isMobile && styles.webSplineContainerMobile
        ]}>
          <iframe
            src="https://my.spline.design/robotfollowcursorforlandingpage-Fr4BBvxn4emdlG8vlg77pgSs/"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '12px',
            }}
            title="3D Robot Agent"
          />
        </View>
      );
    } else {
      const splineHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              margin: 0;
              padding: 0;
              background: transparent;
              overflow: hidden;
            }
            iframe {
              width: 100%;
              height: 100%;
              border: none;
              background: transparent;
            }
          </style>
        </head>
        <body>
          <iframe 
            src='https://my.spline.design/robotfollowcursorforlandingpage-Fr4BBvxn4emdlG8vlg77pgSs/' 
            frameborder='0' 
            width='100%' 
            height='100%'>
          </iframe>
        </body>
        </html>
      `;

      return (
        <View style={[
          styles.webViewContainer,
          isMobile && styles.webViewContainerMobile
        ]}>
          <WebView
            source={{ html: splineHTML }}
            style={styles.webView}
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.webViewLoading}>
                <ActivityIndicator color="#bb86fc" size="large" />
                <Text style={styles.loadingText}>Loading 3D Agent...</Text>
              </View>
            )}
          />
        </View>
      );
    }
  },[]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🤖 AI Crypto Agent</Text>
            <Text style={styles.subtitle}>
              Wallet: {address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'Not provided'}
            </Text>
          </View>

          {/* Quick Prompts */}
          <View style={styles.quickPromptsContainer}>
            <Text style={styles.quickPromptsTitle}>Quick Questions:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={styles.quickPromptButton}
                onPress={() => askPredefinedQuestion("Should I stake my ETH or diversify into LINK?")}
              >
                <Text style={styles.quickPromptText}>ETH vs LINK</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickPromptButton}
                onPress={() => askPredefinedQuestion("What's my portfolio performance?")}
              >
                <Text style={styles.quickPromptText}>Portfolio Analysis</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickPromptButton}
                onPress={() => askPredefinedQuestion("Any DeFi opportunities for me?")}
              >
                <Text style={styles.quickPromptText}>DeFi Advice</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Enhanced Question Input with Rebalance Icon */}
          <BlurView intensity={20} style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={rebalanceMode ? "Ask for portfolio rebalancing advice..." : "Ask about your crypto portfolio..."}
                placeholderTextColor="#888"
                value={question}
                onChangeText={handleQuestionChange}
                multiline
                numberOfLines={4}
              />
              <Animated.View style={{ transform: [{ scale: rebalanceIconScale }] }}>
                <TouchableOpacity
                  style={[
                    styles.rebalanceIcon,
                    rebalanceMode && styles.rebalanceIconActive
                  ]}
                  onPress={toggleRebalanceMode}
                >
                  <Ionicons 
                    name="refresh" 
                    size={20} 
                    color={rebalanceMode ? '#fff' : '#bb86fc'} 
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>
            {rebalanceMode && (
              <View style={styles.modeIndicator}>
                <View style={styles.modeIndicatorDot} />
                <Text style={styles.modeIndicatorText}>Rebalance Mode Active</Text>
              </View>
            )}
          </BlurView>

          {/* Ask Button */}
          <TouchableOpacity
            style={[styles.askButton, loading && styles.disabledButton]}
            onPress={askAgent}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? ['#555', '#666'] : rebalanceMode ? ['#4CAF50', '#45a049'] : ['#bb86fc', '#9c6ff5']}
              style={styles.buttonGradient}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.buttonText}>
                    {rebalanceMode ? 'Analyzing Portfolio...' : 'AI is thinking...'}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.buttonText}>
                    {rebalanceMode ? 'Get Strategies' : 'Ask Agent'}
                  </Text>
                  <Ionicons name="send" size={20} color="white" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Simplified Spline visibility condition */}
          {shouldShowSpline && (
            <Animated.View
              style={[
                styles.splineContainer,
                isWideScreen && styles.splineContainerWide,
                isMobile && styles.splineContainerMobile,
                {
                  opacity: splineOpacity,
                  transform: [{ scale: splineScale }],
                },
              ]}
            >
              <BlurView intensity={10} style={styles.splineBlur}>
                <View style={[
                  styles.splineWrapper,
                  isWideScreen && styles.splineWrapperWide
                ]}>
                  <Text style={styles.splineTitle}>
                    {loading 
                      ? (rebalanceMode ? "AI Agent Analyzing Portfolio..." : "AI Agent Thinking...") 
                      : (rebalanceMode ? "AI Portfolio Advisor Ready" : "AI Agent Ready")
                    }
                  </Text>
                  
                  {/* Loading overlay when processing */}
                  {loading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator color="#bb86fc" size="large" />
                      <Text style={styles.loadingOverlayText}>
                        {rebalanceMode ? 'Preparing rebalance strategies...' : 'Processing your question...'}
                      </Text>
                    </View>
                  )}
                  
                  {SplineComponent}
                </View>
              </BlurView>
            </Animated.View>
          )}

          {/* Error Display */}
          {error && !response ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#ff6b6b" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => setError('')}
              >
                <Text style={styles.retryText}>Clear</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Enhanced Response Display */}
          {response ? (
            <BlurView intensity={15} style={styles.responseContainer}>
              <View style={styles.responseHeader}>
                <Ionicons 
                  name={response.startsWith('⚠️') ? "warning" : rebalanceMode ? "analytics" : "chatbubble-ellipses"} 
                  size={20} 
                  color={response.startsWith('⚠️') ? "#ff6b6b" : rebalanceMode ? "#4CAF50" : "#bb86fc"} 
                />
                <Text style={[
                  styles.responseTitle, 
                  response.startsWith('⚠️') && { color: '#ff6b6b' },
                  rebalanceMode && { color: '#4CAF50' }
                ]}>
                  {response.startsWith('⚠️') 
                    ? 'AI Agent - Error' 
                    : rebalanceMode 
                      ? 'Portfolio Analysis' 
                      : 'AI Response'
                  }
                </Text>
                <TouchableOpacity 
                  style={styles.newQuestionButton}
                  onPress={startNewQuestion}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#bb86fc" />
                  <Text style={styles.newQuestionText}>New Question</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.responseScrollView}>
                <Text style={[
                  styles.responseText,
                  response.startsWith('⚠️') && { color: '#ff9999' }
                ]}>
                  {response}
                </Text>
              </ScrollView>
              
              {/* Show Portfolio Strategies Button */}
              {showStrategiesButton && strategiesData && (
                <TouchableOpacity
                  style={styles.strategiesButton}
                  onPress={showPortfolioStrategies}
                >
                  <LinearGradient
                    colors={['#4CAF50', '#45a049']}
                    style={styles.strategiesButtonGradient}
                  >
                    <Ionicons name="bar-chart" size={20} color="white" />
                    <Text style={styles.strategiesButtonText}>Show Portfolio Strategies</Text>
                    <Ionicons name="arrow-forward" size={16} color="white" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </BlurView>
          ) : null}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#bb86fc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#dcdcdc',
    opacity: 0.8,
  },
  quickPromptsContainer: {
    marginBottom: 20,
  },
  quickPromptsTitle: {
    fontSize: 16,
    color: '#bb86fc',
    marginBottom: 10,
    fontWeight: '600',
  },
  quickPromptButton: {
    backgroundColor: 'rgba(187, 134, 252, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.3)',
  },
  quickPromptText: {
    color: '#bb86fc',
    fontSize: 12,
    fontWeight: '500',
  },
  inputContainer: {
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.3)',
    overflow: 'hidden',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  rebalanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(187, 134, 252, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
    borderWidth: 2,
    borderColor: 'rgba(187, 134, 252, 0.3)',
  },
  rebalanceIconActive: {
    backgroundColor: '#bb86fc',
    borderColor: '#bb86fc',
    shadowColor: '#bb86fc',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  modeIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  modeIndicatorText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  askButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Spline Styles
  splineContainer: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    alignSelf: 'center',
    height: 350,
    width: '100%',
    maxWidth: 400,
  },
  splineContainerWide: {
    height: Math.min(500, height * 0.6),
    width: '70%',
    maxWidth: 600,
  },
  splineContainerMobile: {
    height: 380,
    width: '100%',
    maxWidth: '100%',
  },
  splineBlur: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.2)',
    overflow: 'hidden',
  },
  splineWrapper: {
    flex: 1,
    padding: 15,
    position: 'relative',
  },
  splineWrapperWide: {
    padding: 20,
  },
  splineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#bb86fc',
    textAlign: 'center',
    marginBottom: 10,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    zIndex: 10,
  },
  loadingOverlayText: {
    color: '#bb86fc',
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  webSplineContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  webSplineContainerWide: {
    aspectRatio: 16/9,
  },
  webSplineContainerMobile: {
    aspectRatio: 4/3,
  },
  webViewContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  webViewContainerMobile: {
    minHeight: 300,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingText: {
    color: '#bb86fc',
    marginTop: 10,
    fontSize: 14,
  },
  
  // Error and Response Styles
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: '#ff6b6b',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  errorText: {
    flex: 1,
    color: '#ff6b6b',
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryText: {
    color: '#ff6b6b',
    fontSize: 12,
    fontWeight: '600',
  },
  responseContainer: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.2)',
    overflow: 'hidden',
    maxHeight: 500,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  responseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#bb86fc',
    flex: 1,
  },
  newQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(187, 134, 252, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  newQuestionText: {
    color: '#bb86fc',
    fontSize: 12,
    fontWeight: '600',
  },
  responseScrollView: {
    maxHeight: 300,
  },
  responseText: {
    fontSize: 16,
    color: '#dcdcdc',
    lineHeight: 24,
  },
  
  // Portfolio Strategies Button
  strategiesButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
  },
  strategiesButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  strategiesButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});