import { io } from 'socket.io-client';
import { config } from '../constants/config';
import { secureStorage } from '../utils/storage';
import { APP_CONFIG } from '../constants/config';

class WebSocketService {
  constructor() {
    this.socket = null;
    this. isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = new Map();
  }

  /**
   * Connect to WebSocket server
   */
  async connect() {
    try {
      const token = await secureStorage.getItem(APP_CONFIG.TOKEN_KEY);
      
      if (!token) {
        // Don't spam console - user is not logged in yet
        // console.warn('No auth token found for WebSocket connection');
        return;
      }

      if (this.socket?.connected) {
        // Already connected, no need to warn
        return;
      }

      this.socket = io(config.WS_URL, {
        auth: { token },
        transports: ['websocket', 'polling'], // Allow polling fallback for HTTPS
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 10000, // 10 second timeout
        forceNew: true,
      });

      this.setupEventListeners();
      
      if (__DEV__) {
        console.log('🔌 Connecting to WebSocket...');
      }
    } catch (error) {
      // WebSocket is optional - don't block app if it fails
      if (__DEV__) {
        console.warn('WebSocket connection failed (non-critical):', error.message);
      }
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
      console.log('🔌 WebSocket disconnected');
    }
  }

  /**
   * Setup default event listeners
   */
  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('✅ WebSocket connected');
      this.emitToListeners('connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('❌ WebSocket disconnected:', reason);
      this.emitToListeners('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      // Only log in development, don't spam production
      if (__DEV__ && this.reconnectAttempts === 1) {
        console.warn('WebSocket connection failed (non-critical):', error.message);
      }
      this.emitToListeners('error', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`);
      this.emitToListeners('reconnected', attemptNumber);
    });

    // Custom events from backend
    this.socket.on('notification', (data) => {
      console.log('🔔 Notification received:', data);
      this.emitToListeners('notification', data);
    });

    this.socket.on('attendance: updated', (data) => {
      console.log('📊 Attendance updated:', data);
      this.emitToListeners('attendance:updated', data);
    });

    this.socket.on('location:update', (data) => {
      console.log('📍 Location update:', data);
      this.emitToListeners('location: update', data);
    });

    this.socket.on('geofence:entry', (data) => {
      console.log('🚪 Geofence entry:', data);
      this.emitToListeners('geofence:entry', data);
    });

    this.socket.on('geofence:exit', (data) => {
      console.log('🚪 Geofence exit:', data);
      this.emitToListeners('geofence:exit', data);
    });
  }

  /**
   * Emit event to socket
   */
  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Cannot emit - WebSocket not connected');
    }
  }

  /**
   * Listen to events
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return cleanup function
    return () => this.off(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit to all registered listeners
   */
  emitToListeners(event, data) {
    const listeners = this. listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Join a room
   */
  joinRoom(room) {
    this.emit('join', { room });
  }

  /**
   * Leave a room
   */
  leaveRoom(room) {
    this.emit('leave', { room });
  }

  /**
   * Send location update
   */
  sendLocation(locationData) {
    this.emit('location:track', locationData);
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this. isConnected,
      socketId: this.socket?.id,
      reconnectAttempts:  this.reconnectAttempts,
    };
  }
}

export default new WebSocketService();