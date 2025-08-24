import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

interface PortfolioDriftChartProps {
  currentAllocation: { [key: string]: number };
  targetAllocation: { [key: string]: number };
  driftHistory?: Array<{ timestamp: string; drift: number }>;
}

export default function PortfolioDriftChart({ 
  currentAllocation, 
  targetAllocation, 
  driftHistory = [] 
}: PortfolioDriftChartProps) {
  
  // Prepare data for pie chart (current vs target)
  const pieData = Object.keys(currentAllocation).map((token, index) => ({
    name: token,
    population: currentAllocation[token],
    color: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'][index % 4],
    legendFontColor: '#fff',
    legendFontSize: 12,
  }));

  // Prepare data for line chart (drift over time)
  const lineData = {
    labels: driftHistory.length > 0 
      ? driftHistory.map((_, i) => `${i + 1}`)
      : ['1', '2', '3', '4', '5'],
    datasets: [{
      data: driftHistory.length > 0 
        ? driftHistory.map(h => h.drift)
        : [0, 2, 5, 3, 1], // Sample data
      color: (opacity = 1) => `rgba(187, 134, 252, ${opacity})`,
      strokeWidth: 2,
    }],
  };

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'transparent',
    backgroundGradientTo: 'transparent',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(187, 134, 252, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#bb86fc',
    },
  };

  const pieChartConfig = {
    color: (opacity = 1) => `rgba(187, 134, 252, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  };

  // Calculate total drift
  const totalDrift = Object.keys(targetAllocation).reduce((total, token) => {
    const target = targetAllocation[token] || 0;
    const current = currentAllocation[token] || 0;
    return total + Math.abs(current - target);
  }, 0);

  const getDriftLevel = (drift: number) => {
    if (drift > 20) return { level: 'Critical', color: '#F44336' };
    if (drift > 15) return { level: 'High', color: '#FF9800' };
    if (drift > 10) return { level: 'Medium', color: '#FFC107' };
    return { level: 'Low', color: '#4CAF50' };
  };

  const driftLevel = getDriftLevel(totalDrift);

  return (
    <View style={styles.container}>
      {/* Drift Summary */}
      <View style={styles.driftSummary}>
        <Text style={styles.driftTitle}>Portfolio Drift</Text>
        <View style={styles.driftInfo}>
          <Text style={styles.driftValue}>{totalDrift.toFixed(1)}%</Text>
          <View style={[styles.driftLevelBadge, { backgroundColor: driftLevel.color }]}>
            <Text style={styles.driftLevelText}>{driftLevel.level}</Text>
          </View>
        </View>
      </View>

      {/* Current vs Target Allocation */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Current vs Target Allocation</Text>
        <PieChart
          data={pieData}
          width={width - 80}
          height={200}
          chartConfig={pieChartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>

      {/* Drift Over Time */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Drift Over Time</Text>
        <LineChart
          data={lineData}
          width={width - 80}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.lineChart}
        />
      </View>

      {/* Allocation Details */}
      <View style={styles.allocationDetails}>
        <Text style={styles.detailsTitle}>Allocation Details</Text>
        {Object.keys(targetAllocation).map((token) => {
          const target = targetAllocation[token] || 0;
          const current = currentAllocation[token] || 0;
          const drift = Math.abs(current - target);
          const isOver = current > target;
          
          return (
            <View key={token} style={styles.allocationRow}>
              <Text style={styles.tokenName}>{token}</Text>
              <View style={styles.allocationValues}>
                <Text style={styles.currentValue}>{current.toFixed(1)}%</Text>
                <Text style={styles.targetValue}>→ {target.toFixed(1)}%</Text>
                <Text style={[styles.driftValue, { color: isOver ? '#FF9800' : '#4CAF50' }]}>
                  {isOver ? '+' : '-'}{drift.toFixed(1)}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
  },
  driftSummary: {
    alignItems: 'center',
    marginBottom: 20,
  },
  driftTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  driftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driftValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#bb86fc',
  },
  driftLevelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  driftLevelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chartSection: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  lineChart: {
    borderRadius: 16,
  },
  allocationDetails: {
    marginTop: 10,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tokenName: {
    fontSize: 14,
    color: '#bb86fc',
    fontWeight: '500',
    flex: 1,
  },
  allocationValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  targetValue: {
    fontSize: 14,
    color: '#888',
  },
  driftValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
