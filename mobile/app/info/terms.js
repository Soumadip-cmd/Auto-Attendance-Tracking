import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { Button } from '../../src/components/common/Button';

export default function TermsOfServiceScreen() {
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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Terms of Service</Text>
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>Last updated: December 20, 2025</Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>1. Acceptance of Terms</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          By accessing and using this attendance tracking application, you accept and agree to be bound by these Terms of Service.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>2. Use of Service</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          This service is provided for attendance tracking purposes only. You agree to use it responsibly and in accordance with company policies.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>3. User Responsibilities</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>4. Location Tracking</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          By using this app, you consent to location tracking during check-in and check-out for attendance verification purposes.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>5. Data Usage</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          All data collected is used solely for attendance management and reporting. We do not share your data with third parties.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>6. Termination</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          Your access to this service may be terminated at any time by your employer or administrator.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>7. Changes to Terms</Text>
        <Text style={[styles.paragraph, { color: theme.colors.text }]}>
          We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of modified terms.
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
