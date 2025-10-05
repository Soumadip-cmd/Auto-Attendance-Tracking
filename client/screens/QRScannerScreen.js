import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';
import { Colors, CommonStyles } from '../theme/Colors';

const { width, height } = Dimensions.get('window');

export default function QRScannerScreen({ navigation }) {
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(null);

  useEffect(() => {
    checkCameraPermission();
  }, []);

  const checkCameraPermission = () => {
    // Simulate camera permission check
    setTimeout(() => {
      setCameraPermission('granted');
    }, 1000);
  };

  const startScanning = () => {
    setScanning(true);
    setScannedData(null);
    
    // Simulate QR code scanning
    setTimeout(() => {
      const mockQRData = {
        type: 'attendance',
        classId: 'MATH101',
        className: 'Mathematics 101',
        teacher: 'Prof. Smith',
        room: 'Room 101',
        timestamp: new Date().toISOString(),
        validUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // Valid for 15 minutes
      };
      
      setScannedData(mockQRData);
      setScanning(false);
      handleQRCodeScanned(mockQRData);
    }, 3000);
  };

  const stopScanning = () => {
    setScanning(false);
  };

  const handleQRCodeScanned = (data) => {
    if (data.type === 'attendance') {
      Alert.alert(
        'QR Code Scanned!',
        'Class: ' + data.className + '\nTeacher: ' + data.teacher + '\nRoom: ' + data.room + '\n\nMark attendance for this class?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setScannedData(null),
          },
          {
            text: 'Mark Present',
            onPress: () => markAttendance(data),
          },
        ]
      );
    } else {
      Alert.alert('Invalid QR Code', 'This QR code is not valid for attendance marking.');
      setScannedData(null);
    }
  };

  const markAttendance = (classData) => {
    Alert.alert(
      'Success!',
      'Attendance marked successfully for ' + classData.className + '.\nTime: ' + new Date().toLocaleTimeString(),
      [
        {
          text: 'OK',
          onPress: () => {
            setScannedData(null);
            navigation.navigate('Home');
          },
        },
      ]
    );
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
  };

  const renderCameraView = () => {
    if (cameraPermission !== 'granted') {
      return (
        <View style={styles.permissionContainer}>
          <FontAwesome5 name="camera" size={64} color={Colors.textSecondary} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            Please grant camera permission to scan QR codes for attendance marking.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={checkCameraPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <View style={styles.scannerArea}>
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          
          {scanning && (
            <View style={styles.scanningLine}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>
            {scanning ? 'Scanning QR Code...' : 'Position QR code within frame'}
          </Text>
          <Text style={styles.instructionsText}>
            Point your camera at the class QR code to mark attendance
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <CommonHeader
        title="QR Code Scanner"
        subtitle="Scan to mark attendance"
        showBack={true}
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity 
            style={styles.flashButton}
            onPress={toggleFlash}
          >
            <FontAwesome5 
              name={flashEnabled ? "bolt" : "bolt"} 
              size={20} 
              color={flashEnabled ? Colors.warning : Colors.surface} 
            />
          </TouchableOpacity>
        }
      />

      <View style={styles.content}>
        {renderCameraView()}

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>
          {!scanning ? (
            <TouchableOpacity style={styles.scanButton} onPress={startScanning}>
              <FontAwesome5 name="qrcode" size={24} color="white" />
              <Text style={styles.scanButtonText}>Start Scanning</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopButton} onPress={stopScanning}>
              <FontAwesome5 name="stop" size={24} color="white" />
              <Text style={styles.stopButtonText}>Stop Scanning</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.manualButton} 
            onPress={() => Alert.alert('Manual Entry', 'Manual QR code entry feature coming soon!')}
          >
            <FontAwesome5 name="keyboard" size={20} color={Colors.primary} />
            <Text style={styles.manualButtonText}>Enter Code Manually</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Scans */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Scans</Text>
          
          <View style={styles.recentScanItem}>
            <View style={styles.scanIcon}>
              <FontAwesome5 name="qrcode" size={16} color={Colors.success} />
            </View>
            <View style={styles.scanDetails}>
              <Text style={styles.scanClass}>Mathematics 101</Text>
              <Text style={styles.scanTime}>Today, 10:15 AM</Text>
            </View>
            <View style={styles.scanStatus}>
              <Text style={styles.scanStatusText}> Present</Text>
            </View>
          </View>

          <View style={styles.recentScanItem}>
            <View style={styles.scanIcon}>
              <FontAwesome5 name="qrcode" size={16} color={Colors.success} />
            </View>
            <View style={styles.scanDetails}>
              <Text style={styles.scanClass}>Physics 201</Text>
              <Text style={styles.scanTime}>Yesterday, 2:30 PM</Text>
            </View>
            <View style={styles.scanStatus}>
              <Text style={styles.scanStatusText}> Present</Text>
            </View>
          </View>

          <View style={styles.recentScanItem}>
            <View style={styles.scanIcon}>
              <FontAwesome5 name="qrcode" size={16} color={Colors.warning} />
            </View>
            <View style={styles.scanDetails}>
              <Text style={styles.scanClass}>Chemistry 301</Text>
              <Text style={styles.scanTime}>Yesterday, 9:45 AM</Text>
            </View>
            <View style={styles.scanStatus}>
              <Text style={[styles.scanStatusText, { color: Colors.warning }]}> Late</Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How to Use</Text>
          
          <View style={styles.instructionStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>Tap 'Start Scanning' button</Text>
          </View>

          <View style={styles.instructionStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>Point camera at the QR code</Text>
          </View>

          <View style={styles.instructionStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>Wait for automatic detection</Text>
          </View>

          <View style={styles.instructionStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepText}>Confirm attendance marking</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  flashButton: {
    padding: 5,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  scannerArea: {
    width: width - 80,
    height: width - 80,
    maxWidth: 300,
    maxHeight: 300,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    ...CommonStyles.shadow,
  },
  scannerFrame: {
    width: '80%',
    height: '80%',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.primary,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanningLine: {
    position: 'absolute',
  },
  instructionsContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  instructionsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 20,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
  },
  permissionButton: {
    ...CommonStyles.primaryButton,
    marginTop: 30,
    paddingHorizontal: 30,
  },
  permissionButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlsContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  scanButton: {
    ...CommonStyles.primaryButton,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginBottom: 15,
  },
  scanButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  stopButton: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    ...CommonStyles.shadow,
  },
  stopButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  manualButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 15,
    padding: 20,
    marginTop: 15,
    ...CommonStyles.shadow,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 15,
  },
  recentScanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  scanIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scanDetails: {
    flex: 1,
  },
  scanClass: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  scanTime: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scanStatus: {
    alignItems: 'flex-end',
  },
  scanStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.success,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.surface,
  },
  stepText: {
    fontSize: 16,
    color: Colors.textPrimary,
    flex: 1,
  },
});
