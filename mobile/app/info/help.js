import React from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { Button } from '../../src/components/common/Button';

export default function HelpSupportScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const faqs = [
    {
      question: 'How do I check in?',
      answer: 'Go to the Home tab and tap the "Check In" button. Make sure your location services are enabled.',
    },
    {
      question: 'Why can\'t I check in?',
      answer: 'You need to be within the designated geofence area and have location permissions enabled.',
    },
    {
      question: 'How do I view my attendance history?',
      answer: 'Navigate to the Attendance tab to see your complete check-in/check-out history.',
    },
    {
      question: 'Can I edit my check-in time?',
      answer: 'No, check-in times are automatically recorded and cannot be edited. Contact your administrator for corrections.',
    },
    {
      question: 'How do I change my password?',
      answer: 'Go to Settings > Change Password to update your password.',
    },
    {
      question: 'What if I forgot to check out?',
      answer: 'Contact your administrator to manually adjust your attendance record.',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Button
          variant="ghost"
          onPress={() => router.back()}
          icon={<Ionicons name="arrow-back" size={24} color={theme.colors.text} />}
        />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Help & Support</Text>

        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="mail-outline" size={24} color={theme.colors.primary} />
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Email Support</Text>
            <Text style={[styles.cardText, { color: theme.colors.textSecondary }]}>
              support@attendance.com
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="call-outline" size={24} color={theme.colors.primary} />
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Phone Support</Text>
            <Text style={[styles.cardText, { color: theme.colors.textSecondary }]}>
              +1 (555) 123-4567
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Frequently Asked Questions</Text>

        {faqs.map((faq, index) => (
          <View key={index} style={[styles.faqItem, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.question, { color: theme.colors.text }]}>{faq.question}</Text>
            <Text style={[styles.answer, { color: theme.colors.textSecondary }]}>{faq.answer}</Text>
          </View>
        ))}

        <View style={styles.spacer} />
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
    marginBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardContent: {
    marginLeft: 16,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 16,
  },
  faqItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  answer: {
    fontSize: 14,
    lineHeight: 20,
  },
  spacer: {
    height: 40,
  },
});
