// File: app/history.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
  Alert,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const isMobile = width <= 480;

interface ExecutionRecord {
  execution_id: string;
  strategy_id: string;
  tx_hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  target_allocation: { [key: string]: number };
  total_portfolio_value_usd: number;
  created_at: string;
  estimated_gas_fees: string;
  gas_used?: string;
  trades_executed?: { [key: string]: any };
}

export default function HistoryScreen() {
  const { wallet_address } = useLocalSearchParams();
  const router = useRouter();
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    failed: 0
  });

  // Animation values
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const fetchExecutionHistory = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/executions?wallet=${wallet_address}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch execution history');
      }

      const data = await response.json();
      setExecutions(data.executions || []);
      
      // Calculate stats
      const total = data.executions?.length || 0;
      const confirmed = data.executions?.filter((e: ExecutionRecord) => e.status === 'confirmed').length || 0;
      const pending = data.executions?.filter((e: ExecutionRecord) => e.status === 'pending').length || 0;
      const failed = data.executions?.filter((e: ExecutionRecord) => e.status === 'failed').length || 0;
      
      setStats({ total, confirmed, pending, failed });

    } catch (error) {
      console.error('Error fetching execution history:', error);
      Alert.alert('Error', 'Failed to load execution history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (wallet_address) {
      fetchExecutionHistory();
    }
  }, [wallet_address]);

  const openEtherscan = (txHash: string) => {
    const url = `https://sepolia.etherscan.io/tx/${txHash}`;
    Linking.openURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#00D4AA';
      case 'pending': return '#FFB020';
      case 'failed': return '#FF4757';
      default: return '#A0AEC0';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'failed': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const filteredExecutions = executions.filter(execution => {
    if (selectedFilter === 'all') return true;
    return execution.status === selectedFilter;
  });

  const FilterButton = ({ filter, label }: { filter: string; label: string }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      {selectedFilter === filter && (
        <LinearGradient
          colors={['#8B5CF6', '#A855F7']}
          style={styles.filterButtonGradient}
        />
      )}
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filter && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderExecutionCard = (execution: ExecutionRecord, index: number) => (
    <Animated.View
      key={execution.execution_id}
      style={[
        styles.executionCard,
        {
          opacity: fadeAnim,
          transform: [{
            translateY: slideAnim
          }]
        }
      ]}
    >
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.1)', 'rgba(168, 85, 247, 0.05)']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(execution.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(execution.status) }]}>
              {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {formatDate(execution.created_at)}
          </Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.portfolioValueContainer}>
            <Text style={styles.portfolioLabel}>Portfolio Value</Text>
            <Text style={styles.portfolioValue}>
              {formatCurrency(execution.total_portfolio_value_usd)}
            </Text>
          </View>
          
          {/* Allocation Display */}
          <View style={styles.allocationContainer}>
            <Text style={styles.allocationTitle}>Target Allocation</Text>
            <View style={styles.allocationGrid}>
              {Object.entries(execution.target_allocation).map(([token, percentage]) => (
                <View key={token} style={styles.allocationItem}>
                  <View style={styles.tokenContainer}>
                    <View style={styles.tokenIcon}>
                      <Text style={styles.tokenIconText}>{token.charAt(0)}</Text>
                    </View>
                    <Text style={styles.tokenText}>{token}</Text>
                  </View>
                  <Text style={styles.percentageText}>{percentage}%</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Gas Info */}
          <View style={styles.gasInfo}>
            <View style={styles.gasIcon}>
              <Ionicons name="flash" size={14} color="#8B5CF6" />
            </View>
            <Text style={styles.gasText}>
              Gas: {execution.estimated_gas_fees} ETH
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEtherscan(execution.tx_hash)}
          >
            <Ionicons name="open-outline" size={16} color="#8B5CF6" />
            <Text style={styles.actionButtonText}>Etherscan</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryActionButton]}
            onPress={() => {
              router.push(`/execution-details?execution_id=${execution.execution_id}`);
            }}
          >
            <LinearGradient
              colors={['#8B5CF6', '#A855F7']}
              style={styles.primaryActionGradient}
            >
              <Ionicons name="information-circle-outline" size={16} color="white" />
              <Text style={styles.primaryActionText}>Details</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <LinearGradient 
        colors={['#0F0F23', '#1A1A2E', '#16213E']} 
        style={styles.gradient}
        locations={[0, 0.5, 1]}
      >
        
        {/* Enhanced Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#8B5CF6" />
          </TouchableOpacity>
          
          <View style={styles.headerTextContainer}>
            <View style={styles.titleContainer}>
              <View style={styles.titleIcon}>
                <Ionicons name="time-outline" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.title}>Execution History</Text>
            </View>
            <Text style={styles.subtitle}>
              {wallet_address?.toString().slice(0, 6)}...{wallet_address?.toString().slice(-4)}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => fetchExecutionHistory(true)}
          >
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.2)', 'rgba(168, 85, 247, 0.1)']}
              style={styles.refreshButtonGradient}
            >
              <Ionicons name="refresh" size={20} color="#8B5CF6" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Enhanced Stats Cards */}
        <Animated.View style={[styles.statsSection, { opacity: fadeAnim }]}>
          <ScrollView 
            horizontal 
            style={styles.statsContainer}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsContent}
          >
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.15)', 'rgba(168, 85, 247, 0.1)']}
                style={styles.statCardGradient}
              >
                <Text style={styles.statNumber}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(0, 212, 170, 0.15)', 'rgba(0, 212, 170, 0.1)']}
                style={styles.statCardGradient}
              >
                <Text style={[styles.statNumber, { color: '#00D4AA' }]}>{stats.confirmed}</Text>
                <Text style={styles.statLabel}>Confirmed</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 176, 32, 0.15)', 'rgba(255, 176, 32, 0.1)']}
                style={styles.statCardGradient}
              >
                <Text style={[styles.statNumber, { color: '#FFB020' }]}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 71, 87, 0.15)', 'rgba(255, 71, 87, 0.1)']}
                style={styles.statCardGradient}
              >
                <Text style={[styles.statNumber, { color: '#FF4757' }]}>{stats.failed}</Text>
                <Text style={styles.statLabel}>Failed</Text>
              </LinearGradient>
            </View>
          </ScrollView>
        </Animated.View>

        {/* Filter Buttons */}
        <Animated.View style={[styles.filterSection, { opacity: fadeAnim }]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            <FilterButton filter="all" label="All" />
            <FilterButton filter="confirmed" label="Confirmed" />
            <FilterButton filter="pending" label="Pending" />
            <FilterButton filter="failed" label="Failed" />
          </ScrollView>
        </Animated.View>

        {/* Execution List */}
        <ScrollView
          style={styles.executionsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchExecutionHistory(true)}
              tintColor="#8B5CF6"
              colors={['#8B5CF6']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingSpinner}>
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7']}
                  style={styles.loadingSpinnerGradient}
                >
                  <Ionicons name="hourglass-outline" size={32} color="white" />
                </LinearGradient>
              </View>
              <Text style={styles.loadingText}>Loading execution history...</Text>
            </View>
          ) : filteredExecutions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.1)', 'rgba(168, 85, 247, 0.05)']}
                style={styles.emptyCardGradient}
              >
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="document-outline" size={48} color="#8B5CF6" />
                </View>
                <Text style={styles.emptyTitle}>
                  {selectedFilter === 'all' ? 'No Executions Yet' : `No ${selectedFilter} executions`}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {selectedFilter === 'all' 
                    ? 'Start by generating and implementing a rebalancing strategy'
                    : `Try selecting a different filter or refresh the data`
                  }
                </Text>
                {selectedFilter === 'all' && (
                  <TouchableOpacity
                    style={styles.generateButton}
                    onPress={() => router.push('/ask_agent')}
                  >
                    <LinearGradient
                      colors={['#8B5CF6', '#A855F7']}
                      style={styles.generateButtonGradient}
                    >
                      <Ionicons name="add-circle-outline" size={20} color="white" />
                      <Text style={styles.generateButtonText}>Generate Strategy</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </View>
          ) : (
            <>
              {filteredExecutions.map((execution, index) => renderExecutionCard(execution, index))}
              <View style={styles.bottomSpacing} />
            </>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F23',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  headerTextContainer: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: isMobile ? 24 : 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#A0AEC0',
    fontWeight: '500',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  refreshButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 22,
  },
  statsSection: {
    marginBottom: 24,
  },
  statsContainer: {
    paddingHorizontal: 24,
  },
  statsContent: {
    gap: 12,
  },
  statCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCardGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 90,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterContainer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    position: 'relative',
    overflow: 'hidden',
  },
  filterButtonActive: {
    borderColor: '#8B5CF6',
  },
  filterButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#A0AEC0',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  executionsList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  executionCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 20,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '500',
  },
  cardContent: {
    marginBottom: 20,
  },
  portfolioValueContainer: {
    marginBottom: 16,
  },
  portfolioLabel: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  portfolioValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  allocationContainer: {
    marginBottom: 16,
  },
  allocationTitle: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  allocationGrid: {
    gap: 12,
  },
  allocationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tokenIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenIconText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '700',
  },
  tokenText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  percentageText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '700',
  },
  gasInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gasIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gasText: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    gap: 6,
  },
  primaryActionButton: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  primaryActionGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  primaryActionText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 16,
    overflow: 'hidden',
  },
  loadingSpinnerGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#A0AEC0',
    fontWeight: '500',
  },
  emptyContainer: {
    marginTop: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  emptyCardGradient: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    fontWeight: '500',
  },
  generateButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 8,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomSpacing: {
    height: 60,
  },
});