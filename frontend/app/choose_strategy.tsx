// // File: app/choose_strategy.tsx
// import React from 'react';
// import { 
//   View, 
//   Text, 
//   TouchableOpacity, 
//   ScrollView, 
//   StyleSheet, 
//   Dimensions, 
//   ActivityIndicator,
//   Alert 
// } from 'react-native';
// import { useLocalSearchParams, useRouter } from 'expo-router';
// import { Ionicons } from '@expo/vector-icons';
// import { LinearGradient } from 'expo-linear-gradient';
// import { BlurView } from 'expo-blur';

// const { width } = Dimensions.get('window');
// const isMobile = width <= 480;

// export default function ChooseStrategyScreen() {
//   const { strategies, wallet_address } = useLocalSearchParams();
//   const router = useRouter();
//   const [loading, setLoading] = React.useState(false);
//   const [selectedStrategy, setSelectedStrategy] = React.useState(null);

//   // Parse strategies data
//   let parsedStrategies = [];
//   try {
//     parsedStrategies = JSON.parse(strategies as string);
//   } catch (error) {
//     console.error('Error parsing strategies:', error);
//   }

//   const handleChoose = async (strategy: any) => {
//     if (loading) return;
    
//     setLoading(true);
//     setSelectedStrategy(strategy.strategy_id);

//     try {
//       // Build the full strategy object as expected by backend
//       const requestBody = {
//         wallet_address: wallet_address?.toString().trim(),
//         chosen_strategy: {
//           strategy_id: strategy.strategy_id?.toString().trim(),
//           label: strategy.label || getStrategyLabel(parsedStrategies.indexOf(strategy)),
//           target_allocation: strategy.target_allocation,
//           rationale: strategy.rationale || ''
//         }
//       };

//       console.log('Choose Strategy Request Body:', requestBody);
//       console.log('Strategy Data:', strategy);

//       const result = await fetch('http://localhost:8000/agent/choose', {
//         method: 'POST',
//         headers: { 
//           'Content-Type': 'application/json',
//           'Accept': 'application/json'
//         },
//         body: JSON.stringify(requestBody),
//       });

//       console.log('Choose Strategy Response Status:', result.status);

//       if (!result.ok) {
//         if (result.status === 422) {
//           const errorData = await result.json().catch(() => ({}));
//           console.log('422 Validation Error Details:', errorData);
          
//           let errorMessage = 'Request validation failed. Details:\n';
          
//           if (errorData.detail) {
//             if (Array.isArray(errorData.detail)) {
//               errorData.detail.forEach((err: any) => {
//                 errorMessage += `• ${err.loc?.join('.')} - ${err.msg}\n`;
//               });
//             } else {
//               errorMessage += `• ${errorData.detail}`;
//             }
//           } else {
//             errorMessage = 'Unknown validation error occurred.';
//           }
          
//           Alert.alert('Validation Error', errorMessage);
//           setLoading(false);
//           setSelectedStrategy(null);
//           return;
//         } else {
//           throw new Error(`HTTP error! status: ${result.status}`);
//         }
//       }

//       const data = await result.json();
//       console.log('Choose Strategy Response Data:', data);
      
//       router.push({
//         pathname: '/chart',
//         params: {
//           applied_strategy: JSON.stringify(data.applied_strategy || strategy.target_allocation),
//           expected_return: data.expected_return || '12',
//           sharpe_ratio: data.sharpe_ratio || '1.4',
//           strategy_label: data.chosen_strategy?.label || getStrategyLabel(parsedStrategies.indexOf(strategy)),
//         },
//       });
//     } catch (error) {
//       console.error('Error choosing strategy:', error);
//       Alert.alert(
//         'Error', 
//         `Failed to apply strategy: ${error.message}`,
//         [{ text: 'OK', onPress: () => {
//           setLoading(false);
//           setSelectedStrategy(null);
//         }}]
//       );
//     }
//   };

//   // Enhanced strategy labels
//   const getStrategyLabel = (index: number) => {
//     const labels = [
//       '🛡️ Conservative Strategy',
//       '⚖️ Balanced Strategy', 
//       '🚀 Growth Strategy'
//     ];
//     return labels[index] || `Strategy ${index + 1}`;
//   };

//   const getStrategyDescription = (allocation: any) => {
//     const ethPercent = allocation.ETH;
//     const usdcPercent = allocation.USDC;
    
//     if (usdcPercent >= 50) {
//       return 'Low risk, stable returns with stablecoin focus';
//     } else if (ethPercent >= 50) {
//       return 'Higher risk, maximum growth potential';
//     } else {
//       return 'Balanced risk-reward with diversified allocation';
//     }
//   };

//   const getRiskLevel = (allocation: any) => {
//     const ethPercent = allocation.ETH;
//     const linkPercent = allocation.LINK;
//     const cryptoPercent = ethPercent + linkPercent;
    
//     if (cryptoPercent <= 40) return { level: 'Low', color: '#4CAF50' };
//     if (cryptoPercent <= 60) return { level: 'Medium', color: '#FF9800' };
//     return { level: 'High', color: '#F44336' };
//   };

//   if (parsedStrategies.length === 0) {
//     return (
//       <View style={styles.container}>
//         <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
//           <View style={styles.errorContainer}>
//             <Ionicons name="alert-circle" size={50} color="#ff6b6b" />
//             <Text style={styles.errorText}>No strategies available</Text>
//             <TouchableOpacity 
//               style={styles.backButton}
//               onPress={() => router.back()}
//             >
//               <Text style={styles.backButtonText}>Go Back</Text>
//             </TouchableOpacity>
//           </View>
//         </LinearGradient>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
//         <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
//           {/* Header */}
//           <View style={styles.header}>
//             <TouchableOpacity 
//               style={styles.backIcon}
//               onPress={() => router.back()}
//             >
//               <Ionicons name="chevron-back" size={24} color="#bb86fc" />
//             </TouchableOpacity>
//             <View style={styles.headerTextContainer}>
//               <Text style={styles.title}>📊 Choose Your Strategy</Text>
//               <Text style={styles.subtitle}>
//                 Select the portfolio allocation that matches your investment goals
//               </Text>
//             </View>
//           </View>

//           {/* Wallet Info */}
//           <BlurView intensity={20} style={styles.walletContainer}>
//             <View style={styles.walletInfo}>
//               <Ionicons name="wallet" size={20} color="#bb86fc" />
//               <Text style={styles.walletText}>
//                 {wallet_address ? `${(wallet_address as string).substring(0, 8)}...${(wallet_address as string).substring((wallet_address as string).length - 6)}` : 'Wallet'}
//               </Text>
//             </View>
//           </BlurView>

//           {/* Strategies List */}
//           <View style={styles.strategiesContainer}>
//             {parsedStrategies.map((strategy: any, index: number) => {
//               const risk = getRiskLevel(strategy.target_allocation);
//               const isSelected = selectedStrategy === strategy.strategy_id;
              
//               return (
//                 <BlurView key={index} intensity={15} style={styles.strategyCard}>
//                   <View style={[
//                     styles.strategyContent,
//                     isSelected && styles.strategyContentSelected
//                   ]}>
//                     {/* Strategy Header */}
//                     <View style={styles.strategyHeader}>
//                       <Text style={styles.strategyLabel}>
//                         {getStrategyLabel(index)}
//                       </Text>
//                       <View style={[styles.riskBadge, { backgroundColor: risk.color + '20' }]}>
//                         <Text style={[styles.riskText, { color: risk.color }]}>
//                           {risk.level} Risk
//                         </Text>
//                       </View>
//                     </View>

//                     {/* Strategy Description */}
//                     <Text style={styles.strategyDescription}>
//                       {getStrategyDescription(strategy.target_allocation)}
//                     </Text>

//                     {/* Allocation Display */}
//                     <View style={styles.allocationContainer}>
//                       <Text style={styles.allocationTitle}>Asset Allocation:</Text>
                      
//                       <View style={styles.allocationBars}>
//                         {/* ETH */}
//                         <View style={styles.assetRow}>
//                           <View style={styles.assetInfo}>
//                             <View style={[styles.assetDot, { backgroundColor: '#627EEA' }]} />
//                             <Text style={styles.assetName}>ETH</Text>
//                           </View>
//                           <View style={styles.progressContainer}>
//                             <View style={styles.progressBackground}>
//                               <View 
//                                 style={[
//                                   styles.progressFill, 
//                                   { 
//                                     width: `${strategy.target_allocation.ETH}%`,
//                                     backgroundColor: '#627EEA' 
//                                   }
//                                 ]} 
//                               />
//                             </View>
//                             <Text style={styles.percentageText}>
//                               {strategy.target_allocation.ETH}%
//                             </Text>
//                           </View>
//                         </View>

//                         {/* USDC */}
//                         <View style={styles.assetRow}>
//                           <View style={styles.assetInfo}>
//                             <View style={[styles.assetDot, { backgroundColor: '#2775CA' }]} />
//                             <Text style={styles.assetName}>USDC</Text>
//                           </View>
//                           <View style={styles.progressContainer}>
//                             <View style={styles.progressBackground}>
//                               <View 
//                                 style={[
//                                   styles.progressFill, 
//                                   { 
//                                     width: `${strategy.target_allocation.USDC}%`,
//                                     backgroundColor: '#2775CA' 
//                                   }
//                                 ]} 
//                               />
//                             </View>
//                             <Text style={styles.percentageText}>
//                               {strategy.target_allocation.USDC}%
//                             </Text>
//                           </View>
//                         </View>

//                         {/* LINK */}
//                         <View style={styles.assetRow}>
//                           <View style={styles.assetInfo}>
//                             <View style={[styles.assetDot, { backgroundColor: '#375BD2' }]} />
//                             <Text style={styles.assetName}>LINK</Text>
//                           </View>
//                           <View style={styles.progressContainer}>
//                             <View style={styles.progressBackground}>
//                               <View 
//                                 style={[
//                                   styles.progressFill, 
//                                   { 
//                                     width: `${strategy.target_allocation.LINK}%`,
//                                     backgroundColor: '#375BD2' 
//                                   }
//                                 ]} 
//                               />
//                             </View>
//                             <Text style={styles.percentageText}>
//                               {strategy.target_allocation.LINK}%
//                             </Text>
//                           </View>
//                         </View>
//                       </View>
//                     </View>

//                     {/* Rationale */}
//                     {strategy.rationale && strategy.rationale.trim() && (
//                       <View style={styles.rationaleContainer}>
//                         <Text style={styles.rationaleTitle}>💡 Strategy Rationale:</Text>
//                         <Text style={styles.rationaleText}>
//                           {strategy.rationale.replace('* Rationale:', '').trim()}
//                         </Text>
//                       </View>
//                     )}

//                     {/* Choose Button */}
//                     <TouchableOpacity
//                       style={[
//                         styles.chooseButton,
//                         (loading && isSelected) && styles.disabledButton
//                       ]}
//                       onPress={() => handleChoose(strategy)}
//                       disabled={loading}
//                     >
//                       <LinearGradient
//                         colors={
//                           loading && isSelected 
//                             ? ['#555', '#666'] 
//                             : ['#4CAF50', '#45a049']
//                         }
//                         style={styles.buttonGradient}
//                       >
//                         {loading && isSelected ? (
//                           <>
//                             <ActivityIndicator color="white" size="small" />
//                             <Text style={styles.buttonText}>Applying Strategy...</Text>
//                           </>
//                         ) : (
//                           <>
//                             <Text style={styles.buttonText}>Choose Strategy</Text>
//                             <Ionicons name="arrow-forward" size={16} color="white" />
//                           </>
//                         )}
//                       </LinearGradient>
//                     </TouchableOpacity>
//                   </View>
//                 </BlurView>
//               );
//             })}
//           </View>
//         </ScrollView>
//       </LinearGradient>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   gradient: {
//     flex: 1,
//   },
//   content: {
//     flex: 1,
//     paddingTop: 60,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     marginBottom: 20,
//   },
//   backIcon: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: 'rgba(187, 134, 252, 0.2)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 15,
//   },
//   headerTextContainer: {
//     flex: 1,
//   },
//   title: {
//     fontSize: isMobile ? 24 : 28,
//     fontWeight: 'bold',
//     color: '#bb86fc',
//     marginBottom: 4,
//   },
//   subtitle: {
//     fontSize: 14,
//     color: '#dcdcdc',
//     opacity: 0.8,
//   },
//   walletContainer: {
//     marginHorizontal: 20,
//     marginBottom: 20,
//     borderRadius: 12,
//     overflow: 'hidden',
//     borderWidth: 1,
//     borderColor: 'rgba(187, 134, 252, 0.2)',
//   },
//   walletInfo: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 16,
//     gap: 10,
//   },
//   walletText: {
//     color: '#dcdcdc',
//     fontSize: 14,
//     fontFamily: 'monospace',
//   },
//   strategiesContainer: {
//     paddingHorizontal: 20,
//     gap: 20,
//     paddingBottom: 40,
//   },
//   strategyCard: {
//     borderRadius: 16,
//     overflow: 'hidden',
//     borderWidth: 1,
//     borderColor: 'rgba(187, 134, 252, 0.2)',
//   },
//   strategyContent: {
//     padding: 20,
//   },
//   strategyContentSelected: {
//     borderColor: '#4CAF50',
//     borderWidth: 2,
//   },
//   strategyHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   strategyLabel: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#bb86fc',
//     flex: 1,
//   },
//   riskBadge: {
//     paddingHorizontal: 12,
//     paddingVertical: 4,
//     borderRadius: 12,
//     borderWidth: 1,
//   },
//   riskText: {
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   strategyDescription: {
//     color: '#dcdcdc',
//     fontSize: 14,
//     marginBottom: 16,
//     opacity: 0.9,
//   },
//   allocationContainer: {
//     marginBottom: 16,
//   },
//   allocationTitle: {
//     color: '#bb86fc',
//     fontSize: 16,
//     fontWeight: '600',
//     marginBottom: 12,
//   },
//   allocationBars: {
//     gap: 10,
//   },
//   assetRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//   },
//   assetInfo: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     minWidth: 60,
//   },
//   assetDot: {
//     width: 12,
//     height: 12,
//     borderRadius: 6,
//   },
//   assetName: {
//     color: '#dcdcdc',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   progressContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flex: 1,
//     marginLeft: 20,
//     gap: 12,
//   },
//   progressBackground: {
//     flex: 1,
//     height: 8,
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//     borderRadius: 4,
//     overflow: 'hidden',
//   },
//   progressFill: {
//     height: '100%',
//     borderRadius: 4,
//   },
//   percentageText: {
//     color: '#dcdcdc',
//     fontSize: 14,
//     fontWeight: '600',
//     minWidth: 40,
//     textAlign: 'right',
//   },
//   rationaleContainer: {
//     backgroundColor: 'rgba(187, 134, 252, 0.1)',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 16,
//     borderWidth: 1,
//     borderColor: 'rgba(187, 134, 252, 0.2)',
//   },
//   rationaleTitle: {
//     color: '#bb86fc',
//     fontSize: 14,
//     fontWeight: '600',
//     marginBottom: 8,
//   },
//   rationaleText: {
//     color: '#dcdcdc',
//     fontSize: 13,
//     lineHeight: 20,
//     opacity: 0.9,
//   },
//   chooseButton: {
//     borderRadius: 12,
//     overflow: 'hidden',
//   },
//   disabledButton: {
//     opacity: 0.7,
//   },
//   buttonGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 16,
//     gap: 8,
//   },
//   buttonText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   errorContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 40,
//   },
//   errorText: {
//     color: '#ff6b6b',
//     fontSize: 18,
//     textAlign: 'center',
//     marginVertical: 20,
//   },
//   backButton: {
//     backgroundColor: 'rgba(187, 134, 252, 0.2)',
//     paddingHorizontal: 24,
//     paddingVertical: 12,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: 'rgba(187, 134, 252, 0.3)',
//   },
//   backButtonText: {
//     color: '#bb86fc',
//     fontSize: 16,
//     fontWeight: '600',
//   },
// });
// File: app/choose_strategy.tsx
import React from 'react';
import { API_URL } from '../Api';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Dimensions, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const isMobile = width <= 480;

export default function ChooseStrategyScreen() {
  const { strategies, wallet_address } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [selectedStrategy, setSelectedStrategy] = React.useState(null);

  // Debug logging on component mount
  React.useEffect(() => {
    console.log('=== ChooseStrategyScreen Component Mounted ===');
    console.log('Raw params received:', { strategies, wallet_address });
    console.log('wallet_address type:', typeof wallet_address, 'value:', wallet_address);
    console.log('strategies type:', typeof strategies, 'value:', strategies);
  }, []);

  // Parse strategies data
  let parsedStrategies = [];
  try {
    parsedStrategies = JSON.parse(strategies as string);
    console.log('Successfully parsed strategies:', parsedStrategies);
  } catch (error) {
    console.error('Error parsing strategies:', error);
    console.log('Raw strategies value:', strategies);
  }

  const handleChoose = async (strategy: any) => {
    if (loading) return;
    
    console.log('=== Handle Choose Strategy ===');
    console.log('Selected strategy:', strategy);
    console.log('Strategy index:', parsedStrategies.indexOf(strategy));
    
    setLoading(true);
    setSelectedStrategy(strategy.strategy_id || `strategy_${parsedStrategies.indexOf(strategy)}`);

    try {
      // Generate strategy_id if not present
      const strategyId = strategy.strategy_id || `strategy_${Date.now()}_${parsedStrategies.indexOf(strategy)}`;
      const strategyLabel = getStrategyLabel(parsedStrategies.indexOf(strategy));
      
      console.log('Generated strategy ID:', strategyId);
      console.log('Strategy label:', strategyLabel);
      console.log('Wallet address for navigation:', wallet_address);

      // Build the full strategy object as expected by backend
      const requestBody = {
        wallet_address: wallet_address?.toString().trim(),
        chosen_strategy: {
          strategy_id: strategyId,
          label: strategyLabel,
          target_allocation: strategy.target_allocation,
          rationale: strategy.rationale || ''
        }
      };

      console.log('Choose Strategy Request Body:', JSON.stringify(requestBody, null, 2));

      // Get API URL with fallback
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || API_URL;
      console.log('Using API URL:', apiUrl);

      const result = await fetch(`${apiUrl}/agent/choose`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Choose Strategy Response Status:', result.status);

      if (!result.ok) {
        if (result.status === 422) {
          const errorData = await result.json().catch(() => ({}));
          console.log('422 Validation Error Details:', errorData);
          
          let errorMessage = 'Request validation failed. Details:\n';
          
          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              errorData.detail.forEach((err: any) => {
                errorMessage += `• ${err.loc?.join('.')} - ${err.msg}\n`;
              });
            } else {
              errorMessage += `• ${errorData.detail}`;
            }
          } else {
            errorMessage = 'Unknown validation error occurred.';
          }
          
          Alert.alert('Validation Error', errorMessage);
          setLoading(false);
          setSelectedStrategy(null);
          return;
        } else {
          throw new Error(`HTTP error! status: ${result.status}`);
        }
      }

      const data = await result.json();
      console.log('Choose Strategy Response Data:', data);
      
      // Navigate to chart with ALL required parameters
      const chartParams = {
        applied_strategy: JSON.stringify(data.applied_strategy || strategy.target_allocation),
        expected_return: (data.expected_return || '12').toString(),
        sharpe_ratio: (data.sharpe_ratio || '1.4').toString(),
        strategy_label: data.chosen_strategy?.label || strategyLabel,
        strategy_id: strategyId, // ✅ CRITICAL: Pass strategy_id
        wallet_address: wallet_address?.toString() || '', // ✅ CRITICAL: Pass wallet_address
      };

      console.log('=== Navigating to Chart ===');
      console.log('Chart params:', chartParams);
      
      router.push({
        pathname: '/chart',
        params: chartParams,
      });

    } catch (error) {
      console.error('Error choosing strategy:', error);
      Alert.alert(
        'Error', 
        `Failed to apply strategy: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK', onPress: () => {
          setLoading(false);
          setSelectedStrategy(null);
        }}]
      );
    }
  };

  // Enhanced strategy labels
  const getStrategyLabel = (index: number) => {
    const labels = [
      '🛡️ Conservative Strategy',
      '⚖️ Balanced Strategy', 
      '🚀 Growth Strategy'
    ];
    return labels[index] || `Strategy ${index + 1}`;
  };

  const getStrategyDescription = (allocation: any) => {
    const ethPercent = allocation.ETH;
    const usdcPercent = allocation.USDC;
    
    if (usdcPercent >= 50) {
      return 'Low risk, stable returns with stablecoin focus';
    } else if (ethPercent >= 50) {
      return 'Higher risk, maximum growth potential';
    } else {
      return 'Balanced risk-reward with diversified allocation';
    }
  };

  const getRiskLevel = (allocation: any) => {
    const ethPercent = allocation.ETH || 0;
    const linkPercent = allocation.LINK || 0;
    const cryptoPercent = ethPercent + linkPercent;
    
    if (cryptoPercent <= 40) return { level: 'Low', color: '#4CAF50' };
    if (cryptoPercent <= 60) return { level: 'Medium', color: '#FF9800' };
    return { level: 'High', color: '#F44336' };
  };

  if (parsedStrategies.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={50} color="#ff6b6b" />
            <Text style={styles.errorText}>No strategies available</Text>
            <Text style={styles.errorSubtext}>
              Raw strategies data: {typeof strategies} - {strategies?.toString().slice(0, 100)}...
            </Text>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backIcon}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={24} color="#bb86fc" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Choose Your Strategy</Text>
              <Text style={styles.subtitle}>
                Select the portfolio allocation that matches your investment goals
              </Text>
            </View>
          </View>

          {/* Debug Panel */}
          <BlurView intensity={15} style={styles.debugPanel}>
            <View style={styles.debugHeader}>
              <Ionicons name="bug" size={16} color="#FF9800" />
              <Text style={styles.debugTitle}>Debug Info</Text>
            </View>
            <Text style={styles.debugText}>
              Wallet: {wallet_address?.toString().slice(0, 20)}...
            </Text>
            <Text style={styles.debugText}>
              Strategies Count: {parsedStrategies.length}
            </Text>
            <Text style={styles.debugText}>
              API URL: {process.env.EXPO_PUBLIC_API_URL || '{API_URL} (fallback)'}
            </Text>
          </BlurView>

          {/* Wallet Info */}
          <BlurView intensity={20} style={styles.walletContainer}>
            <View style={styles.walletInfo}>
              <Ionicons name="wallet" size={20} color="#bb86fc" />
              <Text style={styles.walletText}>
                {wallet_address ? `${(wallet_address as string).substring(0, 8)}...${(wallet_address as string).substring((wallet_address as string).length - 6)}` : 'No Wallet'}
              </Text>
            </View>
          </BlurView>

          {/* Strategies List */}
          <View style={styles.strategiesContainer}>
            {parsedStrategies.map((strategy: any, index: number) => {
              const risk = getRiskLevel(strategy.target_allocation);
              const isSelected = selectedStrategy === (strategy.strategy_id || `strategy_${index}`);
              
              return (
                <BlurView key={index} intensity={15} style={styles.strategyCard}>
                  <View style={[
                    styles.strategyContent,
                    isSelected && styles.strategyContentSelected
                  ]}>
                    {/* Strategy Header */}
                    <View style={styles.strategyHeader}>
                      <Text style={styles.strategyLabel}>
                        {getStrategyLabel(index)}
                      </Text>
                      <View style={[styles.riskBadge, { backgroundColor: risk.color + '20' }]}>
                        <Text style={[styles.riskText, { color: risk.color }]}>
                          {risk.level} Risk
                        </Text>
                      </View>
                    </View>

                    {/* Strategy Description */}
                    <Text style={styles.strategyDescription}>
                      {getStrategyDescription(strategy.target_allocation)}
                    </Text>

                    {/* Allocation Display */}
                    <View style={styles.allocationContainer}>
                      <Text style={styles.allocationTitle}>Asset Allocation:</Text>
                      
                      <View style={styles.allocationBars}>
                        {/* ETH */}
                        <View style={styles.assetRow}>
                          <View style={styles.assetInfo}>
                            <View style={[styles.assetDot, { backgroundColor: '#627EEA' }]} />
                            <Text style={styles.assetName}>ETH</Text>
                          </View>
                          <View style={styles.progressContainer}>
                            <View style={styles.progressBackground}>
                              <View 
                                style={[
                                  styles.progressFill, 
                                  { 
                                    width: `${strategy.target_allocation.ETH || 0}%`,
                                    backgroundColor: '#627EEA' 
                                  }
                                ]} 
                              />
                            </View>
                            <Text style={styles.percentageText}>
                              {strategy.target_allocation.ETH || 0}%
                            </Text>
                          </View>
                        </View>

                        {/* USDC */}
                        <View style={styles.assetRow}>
                          <View style={styles.assetInfo}>
                            <View style={[styles.assetDot, { backgroundColor: '#2775CA' }]} />
                            <Text style={styles.assetName}>USDC</Text>
                          </View>
                          <View style={styles.progressContainer}>
                            <View style={styles.progressBackground}>
                              <View 
                                style={[
                                  styles.progressFill, 
                                  { 
                                    width: `${strategy.target_allocation.USDC || 0}%`,
                                    backgroundColor: '#2775CA' 
                                  }
                                ]} 
                              />
                            </View>
                            <Text style={styles.percentageText}>
                              {strategy.target_allocation.USDC || 0}%
                            </Text>
                          </View>
                        </View>

                        {/* LINK */}
                        <View style={styles.assetRow}>
                          <View style={styles.assetInfo}>
                            <View style={[styles.assetDot, { backgroundColor: '#375BD2' }]} />
                            <Text style={styles.assetName}>LINK</Text>
                          </View>
                          <View style={styles.progressContainer}>
                            <View style={styles.progressBackground}>
                              <View 
                                style={[
                                  styles.progressFill, 
                                  { 
                                    width: `${strategy.target_allocation.LINK || 0}%`,
                                    backgroundColor: '#375BD2' 
                                  }
                                ]} 
                              />
                            </View>
                            <Text style={styles.percentageText}>
                              {strategy.target_allocation.LINK || 0}%
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Rationale */}
                    {strategy.rationale && strategy.rationale.trim() && (
                      <View style={styles.rationaleContainer}>
                        <Text style={styles.rationaleTitle}>💡 Strategy Rationale:</Text>
                        <Text style={styles.rationaleText}>
                          {strategy.rationale.replace('* Rationale:', '').trim()}
                        </Text>
                      </View>
                    )}

                    {/* Choose Button */}
                    <TouchableOpacity
                      style={[
                        styles.chooseButton,
                        (loading && isSelected) && styles.disabledButton
                      ]}
                      onPress={() => handleChoose(strategy)}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={
                          loading && isSelected 
                            ? ['#555', '#666'] 
                            : ['#4CAF50', '#45a049']
                        }
                        style={styles.buttonGradient}
                      >
                        {loading && isSelected ? (
                          <>
                            <ActivityIndicator color="white" size="small" />
                            <Text style={styles.buttonText}>Applying Strategy...</Text>
                          </>
                        ) : (
                          <>
                            <Text style={styles.buttonText}>Choose Strategy</Text>
                            <Ionicons name="arrow-forward" size={16} color="white" />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </BlurView>
              );
            })}
          </View>
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
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backIcon: {
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
  debugPanel: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  debugText: {
    fontSize: 10,
    color: '#dcdcdc',
    fontFamily: 'monospace',
    opacity: 0.8,
  },
  walletContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.2)',
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  walletText: {
    color: '#dcdcdc',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  strategiesContainer: {
    paddingHorizontal: 20,
    gap: 20,
    paddingBottom: 40,
  },
  strategyCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.2)',
  },
  strategyContent: {
    padding: 20,
  },
  strategyContentSelected: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  strategyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  strategyLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#bb86fc',
    flex: 1,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '600',
  },
  strategyDescription: {
    color: '#dcdcdc',
    fontSize: 14,
    marginBottom: 16,
    opacity: 0.9,
  },
  allocationContainer: {
    marginBottom: 16,
  },
  allocationTitle: {
    color: '#bb86fc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  allocationBars: {
    gap: 10,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 60,
  },
  assetDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  assetName: {
    color: '#dcdcdc',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 20,
    gap: 12,
  },
  progressBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    color: '#dcdcdc',
    fontSize: 14,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  rationaleContainer: {
    backgroundColor: 'rgba(187, 134, 252, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.2)',
  },
  rationaleTitle: {
    color: '#bb86fc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  rationaleText: {
    color: '#dcdcdc',
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.9,
  },
  chooseButton: {
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 20,
  },
  errorSubtext: {
    color: '#dcdcdc',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.7,
    fontFamily: 'monospace',
  },
  backButton: {
    backgroundColor: 'rgba(187, 134, 252, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.3)',
  },
  backButtonText: {
    color: '#bb86fc',
    fontSize: 16,
    fontWeight: '600',
  },
});