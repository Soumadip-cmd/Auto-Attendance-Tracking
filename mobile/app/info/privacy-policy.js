import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { Button } from '../../src/components/common/Button';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Button
          variant="ghost"
          onPress={() => router.back()}
          icon={<Ionicons name="arrow-back" size={24} color={theme.colors.text} />}
        />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Privacy Policy</Text>
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>Last updated: December 20, 2025</Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>1. Information We Collect</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          We collect location data, attendance records, and personal information to provide attendance tracking services.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>2. How We Use Your Information</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          Your information is used to track attendance, generate reports, and improve our services.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>3. Location Data</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          We collect and store location data only when you check in or check out. You can revoke location permissions at any time.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>4. Data Security</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          We implement industry-standard security measures to protect your personal information.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>5. Your Rights</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          You have the right to access, update, or delete your personal information at any time.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>6. Contact Us</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          If you have any questions about this Privacy Policy, please contact your system administrator.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
});
