import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';

const NetworkDebug = () => {
  const [testResult, setTestResult] = useState('');

  const testConnection = async () => {
    // 🔥 Get your actual IP address first!
    // Windows: Run 'ipconfig' and find your WiFi IPv4 address
    // Mac: Run 'ifconfig en0 | grep inet'
    
    const testUrls = [
      'https://155d3bf55b47.ngrok-free.app',  // 🔥 YOUR NGROK URL
      'http://10.10.0.146:8000',             // Your current IP (will still fail)
      'http://localhost:8000',               // Localhost (will fail on mobile)
    ];

    setTestResult('Testing connections...');

    for (const url of testUrls) {
      try {
        console.log(`Testing: ${url}`);
        
        // Simple GET request to test connectivity
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${url}/docs`, { // FastAPI docs endpoint
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          setTestResult(`✅ SUCCESS: ${url} is working!`);
          Alert.alert('Success! 🎉', `Backend is accessible at: ${url}`);
          return;
        } else {
          setTestResult(prev => prev + `\n❌ ${url}: HTTP ${response.status}`);
        }
      } catch (error) {
        console.error(`Failed ${url}:`, error.message);
        setTestResult(prev => prev + `\n❌ ${url}: ${error.message}`);
      }
    }
    
    Alert.alert('All Failed 😞', 'Backend is not accessible from any URL. Check your setup!');
  };

  return (
    <View style={{ 
      padding: 20, 
      backgroundColor: 'rgba(255,255,255,0.1)', 
      margin: 10, 
      borderRadius: 10 
    }}>
      <TouchableOpacity 
        onPress={testConnection}
        style={{ 
          backgroundColor: '#ff6b6b', 
          padding: 15, 
          borderRadius: 8,
          marginBottom: 10
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          🔍 DEBUG: Test Network Connection
        </Text>
      </TouchableOpacity>
      
      {testResult && (
        <View style={{ 
          backgroundColor: 'rgba(0,0,0,0.3)', 
          padding: 10, 
          borderRadius: 5 
        }}>
          <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'monospace' }}>
            {testResult}
          </Text>
        </View>
      )}
      
      <Text style={{ color: '#aaa', fontSize: 10, textAlign: 'center', marginTop: 5 }}>
        Remove this debug component after fixing the issue
      </Text>
    </View>
  );
};

export default NetworkDebug;