import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.31.103:8000';

export default function TestConnection() {
  const [status, setStatus] = useState('Testing...');
  const [color, setColor] = useState('#FFA500');

  const testConnection = async () => {
    setStatus('Testing connection...');
    setColor('#FFA500');
    
    try {
      console.log('🔍 Testing backend URL:', BACKEND_URL);
      
      const response = await axios.get(`${BACKEND_URL}/docs`, {
        adapter: 'xhr',
        timeout: 5000,
      });
      
      console.log('✅ Response status:', response.status);
      setStatus(`✅ Connected!\nBackend: ${BACKEND_URL}\nStatus: ${response.status}`);
      setColor('#10B981');
    } catch (error: any) {
      console.error('❌ Connection error:', error.message);
      setStatus(`❌ Failed!\nURL: ${BACKEND_URL}\nError: ${error.message}`);
      setColor('#EF4444');
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connection Test</Text>
      <View style={[styles.statusBox, { backgroundColor: color }]}>
        <Text style={styles.statusText}>{status}</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={testConnection}>
        <Text style={styles.buttonText}>Test Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statusBox: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    minWidth: 300,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
