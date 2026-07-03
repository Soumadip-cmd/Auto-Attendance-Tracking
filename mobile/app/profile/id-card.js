import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { format } from 'date-fns';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { attendanceAPI } from '../../src/services/api';
import { getUserAvatarUri } from '../../src/constants/config';
import { Avatar } from '../../src/components/common/Avatar';

const getUserId = (user) => user?._id || user?.id || '';
const safeText = (value) => String(value || 'N/A');
const escapeHtml = (value) =>
  safeText(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
  const avatarUri = getUserAvatarUri(user);

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

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrPayload)}`;

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
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
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
      const html = buildCardHtml({ user, fullName, stats, history, qrUrl, theme });
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
        <View ref={cardRef} collapsable={false} style={[styles.idCard, { backgroundColor: theme.colors.card }]}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardTopBand}
          >
            <View style={styles.punchHole} />
            <View style={styles.bandRow}>
              <View style={styles.orgMark}>
                <Ionicons name="shield-checkmark" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.orgName}>GEO Attendance</Text>
                <Text style={styles.orgSubtext}>Digital Employee Identity</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.photoWrap}>
            <View style={[styles.photoRing, { borderColor: theme.colors.card, backgroundColor: theme.colors.card }]}>
              <Avatar name={fullName} size={92} source={avatarUri ? { uri: avatarUri } : null} />
            </View>
          </View>

          <View style={styles.identityBlock}>
            <Text style={[styles.nameText, { color: theme.colors.text }]}>{fullName}</Text>
            <View style={[styles.roleBadge, { backgroundColor: theme.colors.primary + '18' }]}>
              <Text style={[styles.roleBadgeText, { color: theme.colors.primary }]}>
                {safeText(user?.role).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.employeeText, { color: theme.colors.textSecondary }]}>
              ID · {user?.employeeId || 'Pending assignment'}
            </Text>
          </View>

          <View style={styles.perforation}>
            <View style={[styles.notch, styles.notchLeft, { backgroundColor: theme.colors.background }]} />
            <View style={[styles.dashLine, { borderColor: theme.colors.border }]} />
            <View style={[styles.notch, styles.notchRight, { backgroundColor: theme.colors.background }]} />
          </View>

          <View style={styles.detailGrid}>
            <Info theme={theme} icon="mail-outline" label="Email" value={user?.email} />
            <Info theme={theme} icon="call-outline" label="Phone" value={user?.phoneNumber} />
            <Info theme={theme} icon="business-outline" label="Department" value={user?.departmentRef?.name || user?.department} />
            <Info theme={theme} icon="stats-chart-outline" label="Attendance" value={stats ? `${stats.attendanceRate || 0}% this month` : 'Loading'} />
          </View>

          <View style={[styles.qrCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
            <Image source={{ uri: qrUrl }} style={styles.qrImage} />
            <View style={styles.qrTextWrap}>
              <Text style={[styles.qrTitle, { color: theme.colors.text }]}>Scan to verify</Text>
              <Text style={[styles.qrText, { color: theme.colors.textSecondary }]}>
                Identity, contact, department, and current attendance summary.
              </Text>
              <Text style={[styles.generatedText, { color: theme.colors.textSecondary }]}>
                Issued {format(new Date(), 'dd MMM yyyy, hh:mm a')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            disabled={!!saving}
            onPress={savePdf}
            style={[styles.actionButton, { backgroundColor: theme.colors.primary, opacity: saving ? 0.6 : 1 }]}
          >
            <Ionicons name="document-text-outline" size={19} color="#fff" />
            <Text style={styles.actionText}>{saving === 'pdf' ? 'Saving…' : 'Save PDF'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={!!saving}
            onPress={savePng}
            style={[styles.actionButton, { backgroundColor: theme.colors.text, opacity: saving ? 0.6 : 1 }]}
          >
            <Ionicons name="image-outline" size={19} color="#fff" />
            <Text style={styles.actionText}>{saving === 'png' ? 'Saving…' : 'Save Image'}</Text>
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
              <Text style={[styles.historyStatus, { color: theme.colors.primary }]}>{item.status || 'N/A'}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function Info({ theme, icon, label, value }) {
  return (
    <View style={[styles.infoBox, { backgroundColor: theme.colors.background }]}>
      <Ionicons name={icon} size={14} color={theme.colors.primary} style={{ marginBottom: 4 }} />
      <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.colors.text }]} numberOfLines={2}>
        {safeText(value)}
      </Text>
    </View>
  );
}

function buildCardHtml({ user, fullName, stats, history, qrUrl, theme }) {
  const primary = theme?.colors?.primary || '#6366f1';
  const secondary = theme?.colors?.secondary || '#8b5cf6';
  const rows = history
    .map(
      (item) => `
    <tr>
      <td>${escapeHtml(item.date ? format(new Date(item.date), 'dd MMM yyyy') : 'N/A')}</td>
      <td>${escapeHtml(item.status || 'N/A')}</td>
    </tr>
  `
    )
    .join('');

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          .card { border: 1px solid #d1d5db; border-radius: 18px; overflow: hidden; max-width: 420px; }
          .top { background: linear-gradient(135deg, ${primary}, ${secondary}); color: white; padding: 20px; }
          .body { padding: 20px; text-align: center; }
          h1 { margin: 0; font-size: 22px; }
          .muted { color: #6b7280; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; text-align: left; }
          .box { background: #f3f4f6; border-radius: 12px; padding: 10px; }
          .label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
          .value { font-size: 14px; font-weight: bold; margin-top: 4px; }
          .qr { display: flex; gap: 16px; align-items: center; margin-top: 18px; text-align: left; }
          img { width: 120px; height: 120px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left; }
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
  headerTitle: { fontSize: 18, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  content: { padding: 16, alignItems: 'center' },
  idCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 26,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  cardTopBand: {
    paddingTop: 14,
    paddingBottom: 46,
    paddingHorizontal: 20,
  },
  punchHole: {
    alignSelf: 'center',
    width: 56,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginBottom: 14,
  },
  bandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orgMark: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgName: { color: '#fff', fontSize: 17, fontWeight: '900', fontFamily: 'Inter_900Black' },
  orgSubtext: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2, fontFamily: 'Inter_400Regular' },
  photoWrap: {
    alignItems: 'center',
    marginTop: -46,
  },
  photoRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityBlock: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  nameText: { fontSize: 21, fontWeight: '900', fontFamily: 'Inter_900Black', textAlign: 'center' },
  roleBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.5 },
  employeeText: { fontSize: 13, marginTop: 8, fontFamily: 'Inter_500Medium', fontWeight: '500' },
  perforation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginHorizontal: -1,
  },
  dashLine: {
    flex: 1,
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
  },
  notch: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  notchLeft: { marginLeft: -9 },
  notchRight: { marginRight: -9 },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 18,
  },
  infoBox: {
    width: '47%',
    borderRadius: 14,
    padding: 12,
  },
  infoLabel: { fontSize: 10, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 3 },
  qrCard: {
    flexDirection: 'row',
    gap: 14,
    margin: 18,
    marginTop: 0,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  qrImage: { width: 84, height: 84, borderRadius: 8, backgroundColor: '#fff' },
  qrTextWrap: { flex: 1 },
  qrTitle: { fontSize: 14, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  qrText: { fontSize: 11, lineHeight: 15, marginTop: 4, fontFamily: 'Inter_400Regular' },
  generatedText: { fontSize: 10, marginTop: 8, fontFamily: 'Inter_400Regular' },
  actions: {
    width: '100%',
    maxWidth: 360,
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: { color: '#fff', fontWeight: '800', fontFamily: 'Inter_800ExtraBold', fontSize: 14 },
  sectionTitle: {
    width: '100%',
    maxWidth: 360,
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 10,
  },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  historyRow: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  historyStatus: { fontSize: 13, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', textTransform: 'capitalize' },
});
