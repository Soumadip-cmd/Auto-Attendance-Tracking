import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { format } from 'date-fns';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { attendanceAPI } from '../../src/services/api';
import { Avatar } from '../../src/components/common/Avatar';

const getUserId = (user) => user?._id || user?.id || '';

const safeText = (value) => String(value || 'N/A');

const escapeHtml = (value) =>
  safeText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export default function IdCardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const cardRef = useRef(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsResponse, historyResponse] = await Promise.all([
          attendanceAPI.getStats({ period: 'month' }),
          attendanceAPI.getHistory({ limit: 5 }),
        ]);
        setStats(statsResponse?.data || null);
        setHistory(Array.isArray(historyResponse?.data) ? historyResponse.data.slice(0, 5) : []);
      } catch {
        setStats(null);
        setHistory([]);
      }
    };
    load();
  }, []);

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Employee';
  const qrPayload = useMemo(() => {
    return JSON.stringify({
      type: 'employee-id',
      id: getUserId(user),
      name: fullName,
      employeeId: user?.employeeId || null,
      email: user?.email || null,
      phone: user?.phoneNumber || null,
      department: user?.departmentRef?.name || user?.department || null,
      role: user?.role || null,
      attendanceRate: stats?.attendanceRate ?? null,
      presentDays: stats?.presentDays ?? null,
      generatedAt: new Date().toISOString(),
    });
  }, [fullName, stats, user]);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrPayload)}`;

  const shareFile = async (uri) => {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    } else {
      Alert.alert('Saved', uri);
    }
  };

  const savePng = async () => {
    try {
      setSaving('png');
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
      });
      await shareFile(uri);
    } catch (error) {
      Alert.alert('Save failed', error?.message || 'Could not save ID card image.');
    } finally {
      setSaving(null);
    }
  };

  const savePdf = async () => {
    try {
      setSaving('pdf');
      const html = buildCardHtml({ user, fullName, stats, history, qrUrl });
      const result = await Print.printToFileAsync({ html });
      await shareFile(result.uri);
    } catch (error) {
      Alert.alert('Save failed', error?.message || 'Could not save ID card PDF.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Employee ID Card</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          ref={cardRef}
          collapsable={false}
          style={[styles.idCard, { backgroundColor: theme.colors.card }]}
        >
          <View style={styles.cardTopBand}>
            <View>
              <Text style={styles.orgName}>GEO Attendance</Text>
              <Text style={styles.orgSubtext}>Digital employee identity</Text>
            </View>
            <Ionicons name="shield-checkmark" size={30} color="#fff" />
          </View>

          <View style={styles.cardBody}>
            <Avatar
              name={fullName}
              size={84}
              source={user?.profileImage || user?.profilePicture ? { uri: user.profileImage || user.profilePicture } : null}
            />
            <View style={styles.identityText}>
              <Text style={styles.nameText}>{fullName}</Text>
              <Text style={styles.roleText}>{safeText(user?.role).toUpperCase()}</Text>
              <Text style={styles.employeeText}>{user?.employeeId || 'Employee ID pending'}</Text>
            </View>
          </View>

          <View style={styles.detailGrid}>
            <Info label="Email" value={user?.email} />
            <Info label="Phone" value={user?.phoneNumber} />
            <Info label="Department" value={user?.departmentRef?.name || user?.department} />
            <Info label="Attendance" value={stats ? `${stats.attendanceRate || 0}% this month` : 'Loading'} />
          </View>

          <View style={styles.qrRow}>
            <Image source={{ uri: qrUrl }} style={styles.qrImage} />
            <View style={styles.qrTextWrap}>
              <Text style={styles.qrTitle}>Scan for details</Text>
              <Text style={styles.qrText}>
                Includes identity, phone, department, and current attendance summary.
              </Text>
              <Text style={styles.generatedText}>
                Generated {format(new Date(), 'dd MMM yyyy, hh:mm a')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            disabled={!!saving}
            onPress={savePdf}
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          >
            <Ionicons name="document-text-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>{saving === 'pdf' ? 'Saving...' : 'Save PDF'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={!!saving}
            onPress={savePng}
            style={[styles.actionButton, { backgroundColor: '#111827' }]}
          >
            <Ionicons name="image-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>{saving === 'png' ? 'Saving...' : 'Save PNG'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent attendance</Text>
        {history.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No recent records found.</Text>
        ) : (
          history.map((item) => (
            <View key={item._id} style={[styles.historyRow, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.historyDate, { color: theme.colors.text }]}>
                {item.date ? format(new Date(item.date), 'dd MMM yyyy') : 'N/A'}
              </Text>
              <Text style={[styles.historyStatus, { color: theme.colors.primary }]}>
                {item.status || 'N/A'}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function Info({ label, value }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{safeText(value)}</Text>
    </View>
  );
}

function buildCardHtml({ user, fullName, stats, history, qrUrl }) {
  const rows = history.map((item) => `
    <tr>
      <td>${escapeHtml(item.date ? format(new Date(item.date), 'dd MMM yyyy') : 'N/A')}</td>
      <td>${escapeHtml(item.status || 'N/A')}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          .card { border: 1px solid #d1d5db; border-radius: 18px; overflow: hidden; max-width: 520px; }
          .top { background: #4f46e5; color: white; padding: 20px; }
          .body { padding: 20px; }
          h1 { margin: 0; font-size: 24px; }
          .muted { color: #6b7280; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; }
          .box { background: #f3f4f6; border-radius: 12px; padding: 10px; }
          .label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
          .value { font-size: 14px; font-weight: bold; margin-top: 4px; }
          .qr { display: flex; gap: 16px; align-items: center; margin-top: 18px; }
          img { width: 120px; height: 120px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          td, th { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="top">
            <h1>GEO Attendance</h1>
            <div>Digital employee identity</div>
          </div>
          <div class="body">
            <h1>${escapeHtml(fullName)}</h1>
            <div class="muted">${escapeHtml(user?.role || 'Employee')}</div>
            <h2>${escapeHtml(user?.employeeId || 'Employee ID pending')}</h2>
            <div class="grid">
              <div class="box"><div class="label">Email</div><div class="value">${escapeHtml(user?.email)}</div></div>
              <div class="box"><div class="label">Phone</div><div class="value">${escapeHtml(user?.phoneNumber)}</div></div>
              <div class="box"><div class="label">Department</div><div class="value">${escapeHtml(user?.departmentRef?.name || user?.department)}</div></div>
              <div class="box"><div class="label">Attendance</div><div class="value">${escapeHtml(stats ? `${stats.attendanceRate || 0}% this month` : 'N/A')}</div></div>
            </div>
            <div class="qr">
              <img src="${qrUrl}" />
              <div>
                <strong>Scan for details</strong>
                <p class="muted">Identity, contact, department, and attendance summary.</p>
              </div>
            </div>
            <table>
              <thead><tr><th>Date</th><th>Status</th></tr></thead>
              <tbody>${rows || '<tr><td colspan="2">No recent records</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </body>
    </html>
  `;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  content: { padding: 16 },
  idCard: {
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  cardTopBand: {
    backgroundColor: '#4f46e5',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orgName: { color: '#fff', fontSize: 20, fontWeight: '900' },
  orgSubtext: { color: '#dbeafe', fontSize: 12, marginTop: 3 },
  cardBody: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  identityText: { flex: 1 },
  nameText: { color: '#111827', fontSize: 22, fontWeight: '900' },
  roleText: { color: '#4f46e5', fontSize: 12, fontWeight: '900', marginTop: 4 },
  employeeText: { color: '#111827', fontSize: 16, fontWeight: '800', marginTop: 8 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 18 },
  infoBox: { width: '48%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 10 },
  infoLabel: { color: '#64748b', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  infoValue: { color: '#111827', fontSize: 13, fontWeight: '800', marginTop: 4 },
  qrRow: { flexDirection: 'row', gap: 14, padding: 18, alignItems: 'center' },
  qrImage: { width: 110, height: 110, backgroundColor: '#fff' },
  qrTextWrap: { flex: 1 },
  qrTitle: { color: '#111827', fontSize: 16, fontWeight: '900' },
  qrText: { color: '#64748b', fontSize: 12, lineHeight: 17, marginTop: 5 },
  generatedText: { color: '#94a3b8', fontSize: 10, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 24 },
  actionButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 10 },
  emptyText: { fontSize: 13 },
  historyRow: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: { fontSize: 14, fontWeight: '800' },
  historyStatus: { fontSize: 13, fontWeight: '900', textTransform: 'capitalize' },
});
