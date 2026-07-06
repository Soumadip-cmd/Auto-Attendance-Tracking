import { io } from 'socket.io-client';
import { config, APP_CONFIG } from '../constants/config';
import { secureStorage } from '../utils/storage';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = new Map();
    this._connectPromise = null;
  }

  async connect() {
    // Several places (root layout, live-tracking service, useWebSocket hook)
    // call connect() independently, often within the same tick on app launch.
    // this.socket exists synchronously as soon as io() is called, but
    // `.connected` stays false until the handshake finishes — so a second
    // caller could see `!this.socket?.connected` and open a duplicate socket
    // before the first one finished connecting. Serialize with a shared
    // in-flight promise so concurrent callers await the same attempt.
    if (this._connectPromise) return this._connectPromise;

    this._connectPromise = this._doConnect().finally(() => {
      this._connectPromise = null;
    });

    return this._connectPromise;
  }

  async _doConnect() {
    try {
      const token = await secureStorage.getItem(APP_CONFIG.TOKEN_KEY);

      if (!token) return;
      if (this.socket) return;

      this.socket = io(config.WS_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 10000,
        forceNew: true,
      });

      this.setupEventListeners();

      if (__DEV__) {
        console.log('Connecting to WebSocket...');
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('WebSocket connection failed:', error.message);
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
      console.log('WebSocket disconnected');
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emitToListeners('connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.emitToListeners('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      if (__DEV__ && this.reconnectAttempts === 1) {
        console.warn('WebSocket connection failed:', error.message);
      }
      this.emitToListeners('error', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.emitToListeners('reconnected', attemptNumber);
    });

    this.socket.on('notification', (data) => this.emitToListeners('notification', data));
    this.socket.on('attendance: updated', (data) => this.emitToListeners('attendance:updated', data));
    this.socket.on('attendance:updated', (data) => this.emitToListeners('attendance:updated', data));
    this.socket.on('location:update', (data) => this.emitToListeners('location:update', data));
    this.socket.on('geofence:entry', (data) => this.emitToListeners('geofence:entry', data));
    this.socket.on('geofence:exit', (data) => this.emitToListeners('geofence:exit', data));
    this.socket.on('teacher:location:ack', (data) => this.emitToListeners('teacher:location:ack', data));
    this.socket.on('teacher:location:error', (data) => this.emitToListeners('teacher:location:error', data));
    this.socket.on('teacher:geofence:violation', (data) => this.emitToListeners('teacher:geofence:violation', data));
    this.socket.on('teacher:geofence:event', (data) => this.emitToListeners('teacher:geofence:event', data));
    this.socket.on('movement-permission:approved', (data) => this.emitToListeners('movement-permission:approved', data));
    this.socket.on('movement-permission:rejected', (data) => this.emitToListeners('movement-permission:rejected', data));
  }

  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else if (__DEV__) {
      console.warn('Cannot emit - WebSocket not connected');
    }
  }

  emitWithAck(event, data, timeout = 8000) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.socket.timeout(timeout).emit(event, data, (error, response) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(response);
      });
    });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    return () => this.off(event, callback);
  }

  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emitToListeners(event, data) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  joinRoom(room) {
    this.emit('join', { room });
  }

  leaveRoom(room) {
    this.emit('leave', { room });
  }

  sendLocation(locationData) {
    this.emit('location:track', locationData);
  }

  sendTeacherLocation(locationData) {
    return this.emitWithAck('teacher:location:update', locationData);
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

export default new WebSocketService();
