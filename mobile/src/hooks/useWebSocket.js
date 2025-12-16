import { useEffect, useCallback, useState } from 'react';
import websocketService from '../services/websocket';

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect on mount
    websocketService.connect();

    // Listen to connection status
    const unsubscribeConnected = websocketService.on('connected', () => {
      setIsConnected(true);
    });

    const unsubscribeDisconnected = websocketService.on('disconnected', () => {
      setIsConnected(false);
    });

    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
    };
  }, []);

  const on = useCallback((event, callback) => {
    return websocketService.on(event, callback);
  }, []);

  const emit = useCallback((event, data) => {
    websocketService.emit(event, data);
  }, []);

  const joinRoom = useCallback((room) => {
    websocketService.joinRoom(room);
  }, []);

  const leaveRoom = useCallback((room) => {
    websocketService.leaveRoom(room);
  }, []);

  return {
    isConnected,
    on,
    emit,
    joinRoom,
    leaveRoom,
  };
};