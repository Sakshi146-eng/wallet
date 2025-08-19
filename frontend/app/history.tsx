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
  Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
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
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    failed: 0
  });

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
      case 'confirmed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'failed': return '#F44336';
      default: return '#9E9E9E';
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

  const renderExecutionCard = (execution: ExecutionRecord, index: number) => (
    <BlurView key={execution.execution_id} intensity={15} style={styles.executionCard}>
      <View style={styles.cardHeader}>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={getStatusIcon(execution.status)} 
            size={20} 
            color={getStatusColor(execution.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(execution.status) }]}>
            {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
          </Text>
        </View>
        <Text style={styles.dateText}>
          {formatDate(execution.created_at)}
        </Text>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.portfolioValue}>
          Portfolio: {formatCurrency(execution.total_portfolio_value_usd)}
        </Text>
        
        {/* Allocation Display */}
        <View style={styles.allocationContainer}>
          {Object.entries(execution.target_allocation).map(([token, percentage]) => (
            <View key={token} style={styles.allocationItem}>
              <Text style={styles.tokenText}>{token}</Text>
              <Text style={styles.percentageText}>{percentage}%</Text>
            </View>
          ))}
        </View>

        {/* Gas Info */}
        <View style={styles.gasInfo}>
          <Ionicons name="flash" size={16} color="#BB86FC" />
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
          <Ionicons name="open-outline" size={16} color="#BB86FC" />
          <Text style={styles.actionButtonText}>View on Etherscan</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            // Navigate to execution details
            router.push(`/execution-details?execution_id=${execution.execution_id}`);
          }}
        >
          <Ionicons name="information-circle-outline" size={16} color="#BB86FC" />
          <Text style={styles.actionButtonText}>Details</Text>
        </TouchableOpacity>
      </View>
    </BlurView>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#bb86fc" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>📊 Execution History</Text>
            <Text style={styles.subtitle}>
              Wallet: {wallet_address?.toString().slice(0, 8)}...****
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => fetchExecutionHistory(true)}
          >
            <Ionicons name="refresh" size={24} color="#bb86fc" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <ScrollView 
          horizontal 
          style={styles.statsContainer}
          showsHorizontalScrollIndicator={false}
        >
          <BlurView intensity={15} style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </BlurView>
          
          <BlurView intensity={15} style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.confirmed}</Text>
            <Text style={styles.statLabel}>Confirmed</Text>
          </BlurView>
          
          <BlurView intensity={15} style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#FF9800' }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </BlurView>
          
          <BlurView intensity={15} style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#F44336' }]}>{stats.failed}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </BlurView>
        </ScrollView>

        {/* Execution List */}
        <ScrollView
          style={styles.executionsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchExecutionHistory(true)}
              tintColor="#bb86fc"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading execution history...</Text>
            </View>
          ) : executions.length === 0 ? (
            <BlurView intensity={15} style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={48} color="#bb86fc" style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>No Executions Yet</Text>
              <Text style={styles.emptySubtitle}>
                Start by generating and implementing a rebalancing strategy
              </Text>
              <TouchableOpacity
                style={styles.generateButton}
                onPress={() => router.push('/ask_agent')}
              >
                <LinearGradient
                  colors={['#bb86fc', '#9c6ff5']}
                  style={styles.generateButtonGradient}
                >
                  <Ionicons name="add-circle-outline" size={20} color="white" />
                  <Text style={styles.generateButtonText}>Generate Strategy</Text>
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          ) : (
            <>
              {executions.map((execution, index) => renderExecutionCard(execution, index))}
              
              {/* Bottom Spacing */}
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
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(187, 134, 252, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.2)',
    alignItems: 'center',
    minWidth: 80,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#bb86fc',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#dcdcdc',
    opacity: 0.8,
  },
  executionsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  executionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#dcdcdc',
    opacity: 0.7,
  },
  cardContent: {
    marginBottom: 16,
  },
  portfolioValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dcdcdc',
    marginBottom: 12,
  },
  allocationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  allocationItem: {
    alignItems: 'center',
  },
  tokenText: {
    fontSize: 14,
    color: '#bb86fc',
    fontWeight: '600',
    marginBottom: 2,
  },
  percentageText: {
    fontSize: 16,
    color: '#dcdcdc',
    fontWeight: 'bold',
  },
  gasInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gasText: {
    fontSize: 12,
    color: '#dcdcdc',
    opacity: 0.8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(187, 134, 252, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.2)',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#bb86fc',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#dcdcdc',
    opacity: 0.7,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.2)',
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dcdcdc',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#dcdcdc',
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  generateButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 40,
  },
});