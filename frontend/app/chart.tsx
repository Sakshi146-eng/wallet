import React from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const ChartScreen = ({ route }) => {
  const { applied_strategy, expected_return, sharpe_ratio } = route.params;

  const pieData = Object.entries(applied_strategy).map(([key, value], index) => ({
    name: key,
    population: value,
    color: ['#3366CC', '#DC3912', '#FF9900', '#109618'][index % 4],
    legendFontColor: '#7F7F7F',
    legendFontSize: 14,
  }));

  return (
    <ScrollView style={{ margin: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>
        Asset Allocation
      </Text>
      <PieChart
        data={pieData}
        width={screenWidth - 20}
        height={220}
        chartConfig={chartConfig}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />

      <Text style={{ fontSize: 22, fontWeight: 'bold', marginVertical: 20 }}>
        Performance Metrics
      </Text>
      <BarChart
        data={{
          labels: ['Expected Return', 'Sharpe Ratio'],
          datasets: [
            {
              data: [expected_return * 100, sharpe_ratio],
            },
          ],
        }}
        width={screenWidth - 20}
        height={220}
        yAxisSuffix="%"
        chartConfig={chartConfig}
        verticalLabelRotation={30}
      />

      <Text style={{ fontSize: 22, fontWeight: 'bold', marginVertical: 20 }}>
        Growth Projection (Mock)
      </Text>
      <LineChart
        data={{
          labels: ['Now', '1Y', '2Y', '3Y', '4Y'],
          datasets: [
            {
              data: [100, 115, 132, 150, 172], // example
            },
          ],
        }}
        width={screenWidth - 20}
        height={220}
        yAxisSuffix="$"
        chartConfig={chartConfig}
      />
    </ScrollView>
  );
};

const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(0, 0, 128, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  barPercentage: 0.6,
};

export default ChartScreen;
