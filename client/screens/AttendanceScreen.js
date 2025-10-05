import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';
import { Colors, CommonStyles } from '../theme/Colors';

const { width } = Dimensions.get('window');

export default function AttendanceScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('checking');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nearbyClasses, setNearbyClasses] = useState([]);
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  useEffect(() => {
    checkLocation();
    loadNearbyClasses();
  }, []);

  const checkLocation = () => {
    setLoading(true);
    // Simulate location check
    setTimeout(() => {
      setCurrentLocation({
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'Main Campus, New York University',
      });
      setLocationStatus('in_range');
      setLoading(false);
    }, 2000);
  };

  const loadNearbyClasses = () => {
    // Dummy nearby classes data
    const dummyClasses = [
      {
        id: 1,
        subject: 'Mathematics 101',
        teacher: 'Prof. Smith',
        room: 'Room 101',
        time: '10:00 AM - 11:30 AM',
        distance: '50m',
        status: 'active',
        qrCode: 'MATH101_20241005',
      },
      {
        id: 2,
        subject: 'Physics 201',
        teacher: 'Dr. Johnson',
        room: 'Lab 201',
        time: '11:30 AM - 01:00 PM',
        distance: '120m',
        status: 'upcoming',
        qrCode: 'PHYS201_20241005',
      },
      {
        id: 3,
        subject: 'Chemistry 301',
        teacher: 'Prof. Brown',
        room: 'Lab 301',
        time: '02:00 PM - 03:30 PM',
        distance: '200m',
        status: 'upcoming',
        qrCode: 'CHEM301_20241005',
      },
    ];
    setNearbyClasses(dummyClasses);
  };

  const markAttendanceGeo = (classItem) => {
    setLoading(true);
    
    // Simulate geo-based attendance marking
    setTimeout(() => {
      Alert.alert(
        'Success! ✅',
        `Attendance marked for ${classItem.subject}\nLocation: ${currentLocation.address}\nTime: ${new Date().toLocaleTimeString()}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setAttendanceMarked(true);
              setLoading(false);
            },
          },
        ]
      );
    }, 1500);
  };

  const scanQRCode = () => {
    navigation.navigate('QRScanner');
  };

  const getLocationStatusColor = () => {
    switch (locationStatus) {
      case 'in_range':
        return '#4CAF50';
      case 'out_of_range':
        return '#F44336';
      default:
        return '#FF9800';
    }
  };

  const getLocationStatusText = () => {
    switch (locationStatus) {
      case 'in_range':
        return 'You are within campus bounds';
      case 'out_of_range':
        return 'You are outside campus bounds';
      default:
        return 'Checking your location...';
    }
  };

  const getLocationStatusIcon = () => {
    switch (locationStatus) {
      case 'in_range':
        return <MaterialIcons name="location-on" size={20} color="white" />;
      case 'out_of_range':
        return <MaterialIcons name="location-off" size={20} color="white" />;
      default:
        return <MaterialIcons name="my-location" size={20} color="white" />;
    }
  };

  const getClassStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'upcoming':
        return '#FF9800';
      case 'completed':
        return '#9E9E9E';
      default:
        return '#2196F3';
    }
  };

  return (
    <View style={styles.container}>
      <CommonHeader
        title="Mark Attendance"
        subtitle="Choose your method to check-in"
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

      {/* Location Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location Status</Text>
        <View style={[styles.locationStatus, { backgroundColor: getLocationStatusColor() }]}>
          <View style={styles.locationStatusRow}>
            {getLocationStatusIcon()}
            <Text style={styles.locationStatusText}>
              {getLocationStatusText()}
            </Text>
          </View>
        </View>
        
        {currentLocation && (
          <View style={styles.locationDetails}>
            <Text style={styles.locationText}>Current Location:</Text>
            <Text style={styles.locationAddress}>{currentLocation.address}</Text>
            <Text style={styles.coordinates}>
              Lat: {currentLocation.latitude.toFixed(6)}, 
              Lng: {currentLocation.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>

      {/* Attendance Methods */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Attendance Methods</Text>
        
        <TouchableOpacity 
          style={[styles.methodButton, styles.geoButton]}
          onPress={() => Alert.alert('Info', 'Select a class below to mark geo-based attendance')}
        >
          <MaterialIcons name="my-location" size={24} color="white" />
          <View style={styles.methodContent}>
            <Text style={styles.methodTitle}>Geo-based Attendance</Text>
            <Text style={styles.methodSubtitle}>Automatic location detection</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.methodButton, styles.qrButton]}
          onPress={scanQRCode}
        >
          <MaterialIcons name="qr-code-scanner" size={24} color="white" />
          <View style={styles.methodContent}>
            <Text style={styles.methodTitle}>QR Code Scanner</Text>
            <Text style={styles.methodSubtitle}>Scan class QR code</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Nearby Classes */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nearby Classes</Text>
        
        {nearbyClasses.map((classItem) => (
          <View key={classItem.id} style={styles.classCard}>
            <View style={styles.classHeader}>
              <View style={styles.classInfo}>
                <Text style={styles.className}>{classItem.subject}</Text>
                <Text style={styles.classTeacher}>{classItem.teacher}</Text>
                <Text style={styles.classDetails}>{classItem.room} • {classItem.time}</Text>
              </View>
              <View style={styles.classDistance}>
                <Text style={styles.distanceText}>{classItem.distance}</Text>
                <View 
                  style={[
                    styles.statusDot, 
                    { backgroundColor: getClassStatusColor(classItem.status) }
                  ]} 
                />
              </View>
            </View>
            
            <View style={styles.classActions}>
              <TouchableOpacity 
                style={[
                  styles.actionButton,
                  { 
                    backgroundColor: classItem.status === 'active' ? '#4CAF50' : '#ccc',
                  }
                ]}
                onPress={() => markAttendanceGeo(classItem)}
                disabled={classItem.status !== 'active' || loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="location-on" size={16} color="white" />
                    <Text style={styles.actionText}>
                      {classItem.status === 'active' ? 'Mark Present' : 'Not Available'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.qrActionButton]}
                onPress={() => Alert.alert('QR Code', `QR Code: ${classItem.qrCode}\nScan this code to mark attendance`)}
              >
                <MaterialIcons name="qr-code" size={16} color="white" />
                <Text style={styles.actionText}>Show QR</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Today's Summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Summary</Text>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>3</Text>
            <Text style={styles.summaryLabel}>Total Classes</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>2</Text>
            <Text style={styles.summaryLabel}>Attended</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>1</Text>
            <Text style={styles.summaryLabel}>Remaining</Text>
          </View>
        </View>
      </View>

      {/* Geofence Settings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Geofence Settings</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Campus Radius</Text>
          <Text style={styles.settingValue}>500 meters</Text>
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Auto Check-in</Text>
          <Text style={styles.settingValue}>Enabled</Text>
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Location Accuracy</Text>
          <Text style={styles.settingValue}>High (GPS + Network)</Text>
        </View>
      </View>
      </ScrollView>
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
  card: {
    backgroundColor: Colors.surface,
    margin: 15,
    marginBottom: 0,
    borderRadius: 15,
    padding: 20,
    ...CommonStyles.shadow,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 15,
  },
  locationStatus: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  locationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationStatusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  locationDetails: {
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 10,
  },
  locationText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  locationAddress: {
    fontSize: 16,
    color: Colors.primary,
    marginTop: 5,
  },
  coordinates: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 5,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  geoButton: {
    backgroundColor: Colors.success,
  },
  qrButton: {
    backgroundColor: Colors.primary,
  },

  methodContent: {
    flex: 1,
    marginLeft: 15,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  methodSubtitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.8,
    marginTop: 2,
  },
  classCard: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  classTeacher: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  classDetails: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  classDistance: {
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  classActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  qrActionButton: {
    backgroundColor: Colors.warning,
  },

  actionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 5,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  settingValue: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: 'bold',
  },
});