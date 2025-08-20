import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Dimensions, 
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking
} from 'react-native';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const screenWidth = width;
const isMobile = width <= 480;

export default function ChartScreen() {
  const { 
    applied_strategy, 
    expected_return, 
    sharpe_ratio, 
    strategy_label, 
    strategy_id,
    wallet_address 
  } = useLocalSearchParams();
  
  const router = useRouter();
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  // Debug logging on component mount
  useEffect(() => {
    console.log('=== ChartScreen Component Mounted ===');
    console.log('All params received:', {
      applied_strategy,
      expected_return,
      sharpe_ratio,
      strategy_label,
      strategy_id,
      wallet_address
    });
    
    // Get API URL with fallback
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
    console.log('API URL:', apiUrl);
    
    console.log('strategy_id type:', typeof strategy_id, 'value:', strategy_id);
    console.log('wallet_address type:', typeof wallet_address, 'value:', wallet_address);
    
    // Alert for missing critical data
    if (!strategy_id || !wallet_address) {
      Alert.alert(
        '⚠️ Missing Data',
        `Critical data missing:\n• Strategy ID: ${strategy_id || 'MISSING'}\n• Wallet Address: ${wallet_address || 'MISSING'}`,
        [{ text: 'OK' }]
      );
    }
  }, []);

  // Parse applied_strategy if it's a JSON string
  let parsedStrategy = {};
   try {
    parsedStrategy = typeof applied_strategy === 'string' 
      ? JSON.parse(applied_strategy) 
      : applied_strategy || {};
    console.log('Parsed strategy:', parsedStrategy);
  } catch (error) {
    console.error('Error parsing applied_strategy:', error);
    console.log('Applied strategy raw value:', applied_strategy);
    parsedStrategy = { ETH: 33, USDC: 33, LINK: 34 }; // Fallback
    console.log('Using fallback strategy:', parsedStrategy);
  }

  // Ensure we have valid numbers
  const returnValue = parseFloat(expected_return?.toString() || '12');
  const sharpeValue = parseFloat(sharpe_ratio?.toString() || '1.4');

  const strategyName = strategy_label?.toString() || 'Current Strategy';

  // Generate pie chart data
  const pieData = Object.entries(parsedStrategy).map(([key, value], index) => ({
    name: key,
    population: typeof value === 'number' ? value : parseFloat(value.toString() || '0'),
    color: ['#627EEA', '#2775CA', '#375BD2', '#109618'][index % 4],
    legendFontColor: '#dcdcdc',
    legendFontSize: 14,
  }));

  // Chart configuration for dark theme
  const chartConfig = {
    backgroundGradientFrom: 'transparent',
    backgroundGradientTo: 'transparent',
    color: (opacity = 1) => `rgba(187, 134, 252, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(220, 220, 220, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    decimalPlaces: 1,
  };

  const handleImplementStrategy = async () => {
    console.log('=== Execute Strategy Button Clicked ===');
    console.log('Button clicked at:', new Date().toISOString());
    console.log('Current state - executing:', executing);
    console.log('Current state - executionResult:', executionResult);
    
    // First level validation with detailed logging
    console.log('Validating required parameters...');
    console.log('strategy_id:', strategy_id, 'type:', typeof strategy_id);
    console.log('wallet_address:', wallet_address, 'type:', typeof wallet_address);
    
    if (!strategy_id || !wallet_address) {
      console.error('❌ VALIDATION FAILED - Missing required parameters');
      Alert.alert(
        '❌ Validation Error', 
        `Missing required information:\n\n• Strategy ID: ${strategy_id ? '✅ Present' : '❌ Missing'}\n• Wallet Address: ${wallet_address ? '✅ Present' : '❌ Missing'}\n\nPlease go back and select a strategy again.`,
        [
          { 
            text: 'Go Back', 
            onPress: () => router.back() 
          },
          { 
            text: 'Debug Info', 
            onPress: () => {
              Alert.alert('Debug Info', JSON.stringify({
                strategy_id,
                wallet_address,
                parsedStrategy
              }, null, 2));
            }
          }
        ]
      );
      return;
    }

    // Validate target allocation percentages add up to 100%
    console.log('Validating allocation percentages...');
    console.log('parsedStrategy:', parsedStrategy);
    
    const totalPercentage = Object.values(parsedStrategy).reduce((sum, val) => {
      const numVal = typeof val === 'number' ? val : parseFloat(val?.toString() || '0');
      console.log(`Adding ${val} (${typeof val}) -> ${numVal} to sum ${sum}`);
      return sum + numVal;
    }, 0);

    console.log('Total percentage calculated:', totalPercentage);

    if (Math.abs(totalPercentage - 100) > 0.1) {
      console.error('❌ ALLOCATION VALIDATION FAILED');
      Alert.alert(
        '❌ Allocation Error', 
        `Target allocation percentages must add up to 100%.\n\nCurrent total: ${totalPercentage.toFixed(1)}%\n\nAllocations:\n${Object.entries(parsedStrategy).map(([k, v]) => `• ${k}: ${v}%`).join('\n')}`,
        [{ text: 'OK' }]
      );
      return;
    }

    console.log('✅ All validations passed, proceeding with execution...');

    // Show confirmation dialog
    Alert.alert(
      '🚀 Execute Strategy?',
      `You are about to execute the following strategy:\n\n${Object.entries(parsedStrategy).map(([token, percentage]) => `• ${token}: ${percentage}%`).join('\n')}\n\nWallet: ${wallet_address.toString().slice(0, 8)}...${wallet_address.toString().slice(-6)}\nStrategy ID: ${strategy_id}\n\nThis will submit a transaction to Sepolia testnet.`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('User cancelled execution')
        },
        { 
          text: 'Execute', 
          style: 'default',
          onPress: () => executeStrategyConfirmed()
        }
      ]
    );
  };

  // Execute strategy immediately without confirmation
const executeStrategy = () => {
  executeStrategyConfirmed();
};

  const executeStrategyConfirmed = async () => {
    try {
      console.log('=== Starting Strategy Execution =============================================');
      setExecuting(true);
      
      const requestData = {
        wallet_address: wallet_address.toString(),
        strategy_id: strategy_id.toString(),
        target_allocation: parsedStrategy
      };

      console.log('📤 Preparing API request...');
      
      // Get API URL with fallback
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      console.log('API URL:', apiUrl);
      console.log('Request endpoint:', `${apiUrl}/agent/execute`);
      console.log('Request data:', JSON.stringify(requestData, null, 2));

      const fetchStartTime = Date.now();
      console.log('🌐 Making HTTP request at:', new Date(fetchStartTime).toISOString());

      const response = await fetch(`${apiUrl}/agent/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const fetchEndTime = Date.now();
      console.log(`📡 HTTP request completed in ${fetchEndTime - fetchStartTime}ms`);
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('📥 Raw response received:');
      console.log('Response length:', responseText.length);
      console.log('Response text:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
        console.log('✅ JSON parsed successfully:', result);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('Raw response that failed to parse:', responseText);
        throw new Error(`Invalid JSON response from server. Response: ${responseText.slice(0, 200)}...`);
      }

      if (!response.ok) {
        console.error('❌ HTTP request failed');
        console.error('Status:', response.status);
        console.error('Status text:', response.statusText);
        console.error('Error details:', result);
        throw new Error(result.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('🎉 Execution successful!');
      console.log('Execution result:', JSON.stringify(result, null, 2));
      setExecutionResult(result);

      Alert.alert(
        '🎉 Strategy Executed Successfully!',
        `Portfolio rebalancing transaction submitted!\n\n📋 Execution Details:\n• Execution ID: ${result.execution_id}\n• TX Hash: ${result.tx_hash.slice(0, 16)}...\n• Estimated Gas: ${result.estimated_gas} ETH\n• Status: ${result.status.toUpperCase()}\n\n💬 ${result.message}`,
        [
          {
            text: 'View on Etherscan',
            onPress: () => {
              console.log('Opening Etherscan:', result.etherscan_url);
              Linking.openURL(result.etherscan_url);
            }
          },
          {
            text: 'View History',
            onPress: () => {
              console.log('Navigating to history...');
              router.push(`/history?wallet_address=${wallet_address}`);
            }
          },
          { 
            text: 'Done', 
            style: 'default',
            onPress: () => {
              console.log('User acknowledged successful execution');
            }
          }
        ]
      );

    } catch (error) {
      console.error('=== EXECUTION ERROR ===');
      console.error('Error type:', typeof error);
      console.error('Error details:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      let errorMessage = 'Unknown error occurred. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Error message:', errorMessage);
      } else if (typeof error === 'string') {
        errorMessage = error;
        console.error('String error:', errorMessage);
      }

      // Handle specific error cases
      if (errorMessage.includes('insufficient funds')) {
        errorMessage = '💰 Insufficient funds in wallet for this rebalancing strategy.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = '🌐 Network error. Please check your connection and try again.';
      } else if (errorMessage.includes('gas')) {
        errorMessage = '⛽ Transaction failed due to gas estimation issues.';
      } else if (errorMessage.includes('timeout')) {
        errorMessage = '⏱️ Request timed out. Please try again.';
      }

      Alert.alert(
        '❌ Strategy Execution Failed',
        `${errorMessage}\n\n🔍 Error Details:\n${error instanceof Error ? error.message : String(error)}`,
        [
          { 
            text: 'Retry', 
            onPress: () => {
              console.log('User chose to retry execution');
              handleImplementStrategy();
            }
          },
          { 
            text: 'Debug Info', 
            onPress: () => {
              Alert.alert('Debug Info', JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
                apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
                requestData: {
                  wallet_address: wallet_address?.toString(),
                  strategy_id: strategy_id?.toString(),
                  target_allocation: parsedStrategy
                }
              }, null, 2));
            }
          },
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => console.log('User cancelled after error')
          }
        ]
      );
    } finally {
      console.log('🏁 Execution attempt completed, setting executing to false');
      setExecuting(false);
    }
  };

  const navigateToHistory = () => {
    router.push(`/history?wallet_address=${wallet_address}`);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={24} color="#bb86fc" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>📊 Portfolio Analysis</Text>
              <Text style={styles.subtitle}>
                {strategy_label || 'Strategy Implementation'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.historyButton}
              onPress={navigateToHistory}
            >
              <Ionicons name="time" size={24} color="#bb86fc" />
            </TouchableOpacity>
          </View>

          {/* Debug Information Panel */}
          <BlurView intensity={15} style={styles.debugPanel}>
            <View style={styles.debugHeader}>
              <Ionicons name="bug" size={20} color="#FF9800" />
              <Text style={styles.debugTitle}>Debug Information</Text>
            </View>
            <View style={styles.debugContent}>
              <Text style={styles.debugText}>Strategy ID: {strategy_id || 'MISSING'}</Text>
              <Text style={styles.debugText}>Wallet: {wallet_address?.toString().slice(0, 20)}...</Text>
              <Text style={styles.debugText}>API URL: {process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000 (fallback)'}</Text>
              <Text style={styles.debugText}>
                Allocation: {JSON.stringify(parsedStrategy)}
              </Text>
              <TouchableOpacity
                style={styles.debugButton}
                onPress={() => {
                  Alert.alert('Full Debug Info', JSON.stringify({
                    strategy_id,
                    wallet_address,
                    parsedStrategy,
                    api_url: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
                    all_params: {
                      applied_strategy,
                      expected_return,
                      sharpe_ratio,
                      strategy_label
                    }
                  }, null, 2));
                }}
              >
                <Text style={styles.debugButtonText}>Show Full Debug</Text>
              </TouchableOpacity>
            </View>
          </BlurView>

          {/* Execution Status */}
          {executionResult && (
            <BlurView intensity={15} style={styles.executionStatusCard}>
              <View style={styles.statusHeader}>
                <Ionicons 
                  name={executionResult.status === 'pending' ? 'time' : 'checkmark-circle'} 
                  size={24} 
                  color={executionResult.status === 'pending' ? '#FF9800' : '#4CAF50'} 
                />
                <Text style={styles.statusTitle}>
                  {executionResult.status === 'pending' 
                    ? 'Strategy Execution Pending...' 
                    : 'Strategy Executed Successfully!'}
                </Text>
              </View>
              <View style={styles.statusDetails}>
                <Text style={styles.statusText}>
                  Execution ID: {executionResult.execution_id}
                </Text>
                <Text style={styles.statusText}>
                  TX Hash: {executionResult.tx_hash.slice(0, 20)}...
                </Text>
                <Text style={styles.statusText}>
                  Estimated Gas: {executionResult.estimated_gas} ETH
                </Text>
                <Text style={styles.statusText}>
                  Status: {executionResult.status.toUpperCase()}
                </Text>
                <Text style={styles.statusMessage}>
                  {executionResult.message}
                </Text>
                
                <View style={styles.statusActions}>
                  <TouchableOpacity
                    style={styles.etherscanButton}
                    onPress={() => Linking.openURL(executionResult.etherscan_url)}
                  >
                    <Ionicons name="open-outline" size={16} color="#bb86fc" />
                    <Text style={styles.etherscanText}>View on Etherscan</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.historyButtonSmall}
                    onPress={() => router.push(`/history?wallet_address=${wallet_address}`)}
                  >
                    <Ionicons name="time" size={16} color="#4CAF50" />
                    <Text style={styles.historyText}>View History</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          )}

          {/* Asset Allocation Section */}
          <BlurView intensity={15} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pie-chart" size={24} color="#bb86fc" />
              <Text style={styles.sectionTitle}>Asset Allocation</Text>
            </View>
            
            <View style={styles.chartContainer}>
              <PieChart
                data={pieData}
                width={screenWidth - 60}
                height={220}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                center={[10, 10]}
                absolute
              />
            </View>

            {/* Allocation Details */}
            <View style={styles.allocationDetails}>
              {Object.entries(parsedStrategy).map(([asset, percentage], index) => (
                <View key={asset} style={styles.allocationRow}>
                  <View style={styles.assetInfo}>
                    <View style={[
                      styles.colorIndicator, 
                      { backgroundColor: ['#627EEA', '#2775CA', '#375BD2', '#109618'][index % 4] }
                    ]} />
                    <Text style={styles.assetName}>{asset}</Text>
                  </View>
                  <Text style={styles.percentageText}>
                    {typeof percentage === 'number' ? percentage : parseFloat(percentage?.toString() || '0')}%
                  </Text>
                </View>
              ))}
            </View>
          </BlurView>

          {/* Performance Metrics Section */}
          <BlurView intensity={15} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bar-chart" size={24} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Performance Metrics</Text>
            </View>
            
            <View style={styles.chartContainer}>
              <BarChart
                data={{
                  labels: ['Expected Return', 'Sharpe Ratio'],
                  datasets: [{
                    data: [returnValue, sharpeValue],
                  }],
                }}
                width={screenWidth - 60}
                height={220}
                yAxisSuffix={returnValue > 10 ? "%" : ""}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                }}
                verticalLabelRotation={0}
                showBarTops={true}
                fromZero={true}
              />
            </View>

            {/* Metrics Details */}
            <View style={styles.metricsDetails}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Expected Return</Text>
                <Text style={styles.metricValue}>{returnValue.toFixed(1)}%</Text>
                <Text style={styles.metricSubtext}>Annual projected return</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Sharpe Ratio</Text>
                <Text style={styles.metricValue}>{sharpeValue.toFixed(2)}</Text>
                <Text style={styles.metricSubtext}>Risk-adjusted return</Text>
              </View>
            </View>
          </BlurView>

          {/* Growth Projection Section */}
          <BlurView intensity={15} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trending-up" size={24} color="#FF9800" />
              <Text style={styles.sectionTitle}>Growth Projection</Text>
            </View>
            
            <View style={styles.chartContainer}>
              <LineChart
                data={{
                  labels: ['Now', '1Y', '2Y', '3Y', '4Y'],
                  datasets: [{
                    data: [
                      100, 
                      100 * (1 + returnValue/100), 
                      100 * Math.pow(1 + returnValue/100, 2),
                      100 * Math.pow(1 + returnValue/100, 3),
                      100 * Math.pow(1 + returnValue/100, 4)
                    ],
                    color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
                    strokeWidth: 3,
                  }],
                }}
                width={screenWidth - 60}
                height={220}
                yAxisPrefix="$"
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
                }}
                bezier
                style={styles.lineChart}
              />
            </View>

            <Text style={styles.projectionNote}>
              💡 Projection based on {returnValue}% annual return assumption
            </Text>
          </BlurView>

          {/* Risk Analysis Section */}
          <BlurView intensity={15} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#FF5722" />
              <Text style={styles.sectionTitle}>Risk Analysis</Text>
            </View>
            
            <View style={styles.riskMetrics}>
              <View style={styles.riskCard}>
                <Text style={styles.riskLabel}>Diversification</Text>
                <Text style={styles.riskValue}>
                  {Object.keys(parsedStrategy).length > 2 ? 'Good' : 'Moderate'}
                </Text>
                <Text style={styles.riskSubtext}>
                  {Object.keys(parsedStrategy).length} assets
                </Text>
              </View>
              <View style={styles.riskCard}>
                <Text style={styles.riskLabel}>Volatility</Text>
                <Text style={styles.riskValue}>
                  {sharpeValue > 1.5 ? 'Low' : sharpeValue > 1.0 ? 'Moderate' : 'High'}
                </Text>
                <Text style={styles.riskSubtext}>
                  Based on Sharpe ratio
                </Text>
              </View>
            </View>
          </BlurView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.back()}
            >
              <LinearGradient
                colors={['#6C757D', '#5A6268']}
                style={styles.buttonGradient}
              >
                <Ionicons name="arrow-back" size={20} color="white" />
                <Text style={styles.buttonText}>Back to Strategies</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton, 
                (executing || !!executionResult) && styles.disabledButton
              ]}
              onPress={handleImplementStrategy}
              disabled={executing || !!executionResult}
            >
              <LinearGradient
                colors={
                  executing 
                    ? ['#FF9800', '#F57C00'] 
                    : executionResult 
                      ? ['#9E9E9E', '#757575'] 
                      : ['#4CAF50', '#45a049']
                }
                style={styles.buttonGradient}
              >
                {executing ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={styles.buttonText}>Executing Strategy...</Text>
                  </>
                ) : executionResult ? (
                  <>
                    <Ionicons 
                      name={executionResult.status === 'pending' ? 'time' : 'checkmark-circle'} 
                      size={20} 
                      color="white" 
                    />
                    <Text style={styles.buttonText}>
                      {executionResult.status === 'pending' ? 'Execution Pending' : 'Strategy Executed'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="rocket" size={20} color="white" />
                    <Text style={styles.buttonText}>Execute Strategy</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              ⚠️ This is a simulated strategy execution on Sepolia testnet. 
              Actual performance may vary. Always do your own research.
            </Text>
          </View>
        </ScrollView>

        {/* Confirmation Dialog Modal */}
        <Modal
          visible={showConfirmDialog}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCancelConfirmation}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={20} style={styles.modalContainer}>
              <View style={styles.modalContent}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Ionicons name="warning" size={32} color="#FF6B6B" />
                  <Text style={styles.modalTitle}>Confirm Strategy Implementation</Text>
                </View>

                {/* Modal Body */}
                <View style={styles.modalBody}>
                  <Text style={styles.modalDescription}>
                    You are about to implement this strategy in your live portfolio. This action will:
                  </Text>
                  
                  <View style={styles.warningList}>
                    <Text style={styles.warningItem}>• Rebalance your current holdings</Text>
                    <Text style={styles.warningItem}>• Execute trades based on the new allocation</Text>
                    <Text style={styles.warningItem}>• Apply the selected investment strategy</Text>
                  </View>

                  <Text style={styles.confirmationInstruction}>
                    Please type <Text style={styles.strategyNameHighlight}>"{strategyName}"</Text> to confirm:
                  </Text>

                  <TextInput
                    style={styles.confirmationInput}
                    placeholder={`Type "${strategyName}" here...`}
                    placeholderTextColor="#888"
                    value={confirmationText}
                    onChangeText={setConfirmationText}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Modal Actions */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelConfirmation}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      confirmationText.trim() !== strategyName && styles.confirmButtonDisabled
                    ]}
                    onPress={handleConfirmImplementation}
                    disabled={confirmationText.trim() !== strategyName}
                  >
                    <LinearGradient
                      colors={
                        confirmationText.trim() === strategyName
                          ? ['#FF6B6B', '#FF5252']
                          : ['#666', '#555']
                      }
                      style={styles.confirmButtonGradient}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                      <Text style={styles.confirmButtonText}>
                        Implement Strategy
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </View>
        </Modal>
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
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(187, 134, 252, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: isMobile ? 24 : 28,
    fontWeight: 'bold',
    color: '#bb86fc',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#dcdcdc',
    opacity: 0.8,
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(187, 134, 252, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugPanel: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  debugContent: {
    gap: 6,
  },
  debugText: {
    fontSize: 11,
    color: '#dcdcdc',
    fontFamily: 'monospace',
    opacity: 0.8,
  },
  debugButton: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  debugButtonText: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '600',
  },
  executionStatusCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.4)',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    flex: 1,
  },
  statusDetails: {
    gap: 8,
  },
  statusText: {
    fontSize: 13,
    color: '#dcdcdc',
    opacity: 0.9,
    fontFamily: 'monospace',
  },
  statusMessage: {
    fontSize: 14,
    color: '#dcdcdc',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  statusActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  etherscanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(187, 134, 252, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  etherscanText: {
    fontSize: 12,
    color: '#bb86fc',
    fontWeight: '600',
  },
  historyButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  historyText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.2)',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dcdcdc',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  allocationDetails: {
    gap: 12,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  assetName: {
    color: '#dcdcdc',
    fontSize: 16,
    fontWeight: '600',
  },
  percentageText: {
    color: '#bb86fc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  metricsDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  metricLabel: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    color: '#dcdcdc',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSubtext: {
    color: '#dcdcdc',
    fontSize: 10,
    opacity: 0.7,
    textAlign: 'center',
  },
  lineChart: {
    borderRadius: 12,
  },
  projectionNote: {
    color: '#dcdcdc',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
  },
  riskMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  riskCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 87, 34, 0.2)',
  },
  riskLabel: {
    color: '#FF5722',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  riskValue: {
    color: '#dcdcdc',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  riskSubtext: {
    color: '#dcdcdc',
    fontSize: 10,
    opacity: 0.7,
    textAlign: 'center',
  },
  actionButtons: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disclaimer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#dcdcdc',
    opacity: 0.6,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});
