import { View, Text, StyleSheet } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Auto Attendance Tracking</Text>
      <Text style={styles.subtitle}>Welcome to the app!</Text>
      <Text style={styles.info}>
        This is a production-ready geolocation-based staff attendance tracking system.
      </Text>
      <Text style={styles.note}>
        Configure your backend API URL in the .env file to get started.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  info: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
