import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:5000';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = new Map();
  }

  async connect() {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        console.warn('No access token found, cannot connect to WebSocket');
        return;
      }

      this.socket = io(WS_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }

  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connection_status', { connected: true });
    });

    this.socket.on('connected', (data) => {
      console.log('WebSocket authentication successful:', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('connection_status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });

    // Handle heartbeat
    this.socket.on('heartbeat', (data) => {
      // Respond to heartbeat to keep connection alive
      console.log('Heartbeat received');
    });

    // Handle pong
    this.socket.on('pong', (data) => {
      console.log('Pong received:', data);
    });

    // Location updates (for admin/manager)
    this.socket.on('location:update', (data) => {
      this.emit('location_update', data);
    });

    // Attendance updates
    this.socket.on('attendance:checkin', (data) => {
      this.emit('attendance_checkin', data);
    });

    this.socket.on('attendance:checkout', (data) => {
      this.emit('attendance_checkout', data);
    });

    // Alerts
    this.socket.on('alert:new', (data) => {
      this.emit('alert', data);
    });

    // Subscription confirmations
    this.socket.on('subscribed:live-locations', (data) => {
      console.log('Subscribed to live locations:', data);
    });

    this.socket.on('subscribed:attendance', (data) => {
      console.log('Subscribed to attendance updates:', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Subscribe to live locations (admin/manager only)
  subscribeLiveLocations() {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe:live-locations');
    }
  }

  // Unsubscribe from live locations
  unsubscribeLiveLocations() {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe:live-locations');
    }
  }

  // Subscribe to attendance updates
  subscribeAttendance() {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe:attendance');
    }
  }

  // Send ping
  ping() {
    if (this.socket && this.isConnected) {
      this.socket.emit('ping');
    }
  }

  // Send status update
  sendStatusUpdate(status) {
    if (this.socket && this.isConnected) {
      this.socket.emit('status:update', { status });
    }
  }

  // Event listener methods
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in listener for event ${event}:`, error);
      }
    });
  }

  removeAllListeners() {
    this.listeners.clear();
  }
}

export default new WebSocketService();
