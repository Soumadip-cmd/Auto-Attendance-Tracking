import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function QRScannerScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [simulateScanning, setSimulateScanning] = useState(false);

  useEffect(() => {
    // Simulate camera permission request
    setTimeout(() => {
      setHasPermission(true);
    }, 1000);
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    setScanning(false);
    
    // Simulate QR code processing
    processQRCode(data);
  };

  const processQRCode = (qrData) => {
    // Dummy QR code validation
    const validQRCodes = [
      { code: 'MATH101_20241005', subject: 'Mathematics 101', teacher: 'Prof. Smith', room: 'Room 101' },
      { code: 'PHYS201_20241005', subject: 'Physics 201', teacher: 'Dr. Johnson', room: 'Lab 201' },
      { code: 'CHEM301_20241005', subject: 'Chemistry 301', teacher: 'Prof. Brown', room: 'Lab 301' },
    ];

    const foundClass = validQRCodes.find(item => item.code === qrData);

    if (foundClass) {
      Alert.alert(
        'Attendance Marked! ✅',
        `Subject: ${foundClass.subject}\nTeacher: ${foundClass.teacher}\nRoom: ${foundClass.room}\nTime: ${new Date().toLocaleTimeString()}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      Alert.alert(
        'Invalid QR Code ❌',
        'This QR code is not valid for attendance marking. Please scan a valid class QR code.',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              setScanning(true);
            },
          },
          {
            text: 'Cancel',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  };

  const simulateQRScan = (qrCode) => {
    setSimulateScanning(true);
    setTimeout(() => {
      setSimulateScanning(false);
      handleBarCodeScanned({ type: 'qr', data: qrCode });
    }, 1500);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>No Camera Access</Text>
          <Text style={styles.errorText}>
            Camera permission is required to scan QR codes for attendance marking.
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={() => setHasPermission(true)}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
      </View>

      {/* Camera View Simulation */}
      <View style={styles.cameraContainer}>
        <View style={styles.cameraView}>
          <View style={styles.scanArea}>
            <View style={styles.scanCorners}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            
            {scanning && (
              <View style={styles.scanLine} />
            )}
            
            {simulateScanning && (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.scanningText}>Processing QR Code...</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionTitle}>
          {scanning ? 'Align QR code within the frame' : 'QR Code Scanned!'}
        </Text>
        <Text style={styles.instructionText}>
          {scanning 
            ? 'Make sure the QR code is clearly visible and well-lit'
            : 'Processing attendance information...'
          }
        </Text>
      </View>

      {/* Demo QR Codes */}
      <View style={styles.demoContainer}>
        <Text style={styles.demoTitle}>Demo QR Codes (For Testing)</Text>
        <View style={styles.demoButtons}>
          <TouchableOpacity 
            style={[styles.demoButton, styles.mathButton]}
            onPress={() => simulateQRScan('MATH101_20241005')}
            disabled={simulateScanning}
          >
            <View style={styles.demoButtonContent}>
              <FontAwesome5 name="calculator" size={12} color="white" />
              <Text style={styles.demoButtonText}>Math Class</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.demoButton, styles.physicsButton]}
            onPress={() => simulateQRScan('PHYS201_20241005')}
            disabled={simulateScanning}
          >
            <Text style={styles.demoButtonText}>⚛️ Physics Class</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.demoButton, styles.chemistryButton]}
            onPress={() => simulateQRScan('CHEM301_20241005')}
            disabled={simulateScanning}
          >
            <Text style={styles.demoButtonText}>🧪 Chemistry Class</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.demoButton, styles.invalidButton]}
            onPress={() => simulateQRScan('INVALID_CODE')}
            disabled={simulateScanning}
          >
            <Text style={styles.demoButtonText}>❌ Invalid Code</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            setScanned(false);
            setScanning(true);
          }}
          disabled={simulateScanning}
        >
          <Text style={styles.actionButtonText}>
            {scanning ? '📷 Scanning...' : '🔄 Scan Again'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.cancelButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.actionButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  backButton: {
    marginRight: 20,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraView: {
    width: width * 0.8,
    height: width * 0.8,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  scanArea: {
    width: '80%',
    height: '80%',
    position: 'relative',
  },
  scanCorners: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4CAF50',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#4CAF50',
    top: '50%',
    opacity: 0.8,
  },
  scanningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  instructionsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    alignItems: 'center',
  },
  instructionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  instructionText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  demoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  demoButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  demoButton: {
    width: (width - 60) / 2,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  mathButton: {
    backgroundColor: '#4CAF50',
  },
  physicsButton: {
    backgroundColor: '#2196F3',
  },
  chemistryButton: {
    backgroundColor: '#FF9800',
  },
  invalidButton: {
    backgroundColor: '#F44336',
  },
  demoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginLeft: 5,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});