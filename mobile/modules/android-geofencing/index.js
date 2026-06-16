import { Platform } from 'react-native';
import { requireNativeModule, EventEmitter } from 'expo';

const NativeModule =
  Platform.OS === 'android' ? requireNativeModule('AndroidGeofencing') : null;

const emitter = NativeModule ? new EventEmitter(NativeModule) : null;

export function addGeofences(regions) {
  return NativeModule?.addGeofences(regions) ?? Promise.resolve();
}

export function removeGeofences(identifiers) {
  return NativeModule?.removeGeofences(identifiers) ?? Promise.resolve();
}

export function removeAllGeofences() {
  return NativeModule?.removeAllGeofences() ?? Promise.resolve();
}

export function getPendingEvents() {
  return NativeModule?.getPendingEvents() ?? Promise.resolve([]);
}

export function addTransitionListener(listener) {
  if (!emitter) return { remove: () => {} };
  return emitter.addListener('onGeofenceTransition', listener);
}
