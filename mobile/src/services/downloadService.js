import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { config, APP_CONFIG } from '../constants/config';
import { secureStorage } from '../utils/storage';

const EXTENSIONS = {
  pdf: 'pdf',
  excel: 'xlsx',
  xlsx: 'xlsx',
  csv: 'csv',
};

const sanitizeFilename = (name) => name.replace(/[^\w.-]+/g, '_');

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });
  return query.toString();
};

export const downloadMyAttendanceReport = async ({ format = 'pdf', startDate, endDate } = {}) => {
  const token = await secureStorage.getItem(APP_CONFIG.TOKEN_KEY);
  const normalizedFormat = format === 'xlsx' ? 'excel' : format;
  const ext = EXTENSIONS[normalizedFormat] || 'pdf';
  const query = buildQuery({ format: normalizedFormat, startDate, endDate });
  const url = `${config.API_URL}/attendance/export/my${query ? `?${query}` : ''}`;
  const filename = sanitizeFilename(`my_attendance_${startDate || 'from_start'}_${endDate || 'today'}.${ext}`);
  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  const result = await FileSystem.downloadAsync(url, fileUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Download failed with status ${result.status}`);
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri);
  }

  return result.uri;
};
