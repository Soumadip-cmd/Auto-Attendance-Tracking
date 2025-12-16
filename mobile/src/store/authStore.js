import { create } from 'zustand';
import { authAPI } from '../services/api';
import { secureStorage } from '../utils/storage';
import { APP_CONFIG } from '../constants/config';
import websocketService from '../services/websocket';

export const useAuthStore = create((set, get) => ({
  // State
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error:  null,

  /**
   * Initialize auth state from storage
   */
  initAuth:  async () => {
    try {
      set({ isLoading: true });
      
      const token = await secureStorage.getItem(APP_CONFIG.TOKEN_KEY);
      const refreshToken = await secureStorage.getItem(APP_CONFIG.REFRESH_TOKEN_KEY);
      const userJson = await secureStorage.getItem(APP_CONFIG.USER_KEY);
      
      if (token && userJson) {
        const user = JSON.parse(userJson);
        set({
          token,
          refreshToken,
          user,
          isAuthenticated:  true,
          isLoading: false,
        });

        // Connect to WebSocket
        await websocketService.connect();
        
        return true;
      } else {
        set({ isLoading: false });
        return false;
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isLoading: false, error: error.message });
      return false;
    }
  },

  /**
   * Login
   */
  login: async (credentials) => {
    try {
      set({ isLoading:  true, error: null });

      const response = await authAPI. login(credentials);
      const { user, token, refreshToken } = response.data;

      // Store in secure storage
      await secureStorage.setItem(APP_CONFIG. TOKEN_KEY, token);
      await secureStorage.setItem(APP_CONFIG.REFRESH_TOKEN_KEY, refreshToken);
      await secureStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(user));

      set({
        user,
        token,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Connect to WebSocket
      await websocketService.connect();

      return { success: true, user };
    } catch (error) {
      set({
        isLoading: false,
        error:  error.message || 'Login failed',
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Register
   */
  register: async (userData) => {
    try {
      set({ isLoading: true, error: null });

      const response = await authAPI.register(userData);
      const { user, token, refreshToken } = response. data;

      // Store in secure storage
      await secureStorage. setItem(APP_CONFIG.TOKEN_KEY, token);
      await secureStorage.setItem(APP_CONFIG.REFRESH_TOKEN_KEY, refreshToken);
      await secureStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(user));

      set({
        user,
        token,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Connect to WebSocket
      await websocketService.connect();

      return { success: true, user };
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Registration failed',
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Logout
   */
  logout:  async () => {
    try {
      set({ isLoading:  true });

      // Call backend logout
      await authAPI. logout();

      // Clear storage
      await secureStorage.removeItem(APP_CONFIG.TOKEN_KEY);
      await secureStorage.removeItem(APP_CONFIG. REFRESH_TOKEN_KEY);
      await secureStorage.removeItem(APP_CONFIG.USER_KEY);

      // Disconnect WebSocket
      websocketService.disconnect();

      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error:  null,
      });

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      
      // Clear state anyway
      set({
        user:  null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });

      return { success: true }; // Still success even if API call fails
    }
  },

  /**
   * Update profile
   */
  updateProfile: async (data) => {
    try {
      set({ isLoading: true, error: null });

      const response = await authAPI.updateProfile(data);
      const { user } = response.data;

      // Update storage
      await secureStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(user));

      set({
        user,
        isLoading: false,
        error:  null,
      });

      return { success: true, user };
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Profile update failed',
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Change password
   */
  changePassword: async (data) => {
    try {
      set({ isLoading: true, error: null });

      await authAPI.changePassword(data);

      set({ isLoading: false, error:  null });

      return { success:  true };
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Password change failed',
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Refresh user data
   */
  refreshUser: async () => {
    try {
      const response = await authAPI.getProfile();
      const { user } = response.data;

      // Update storage
      await secureStorage. setItem(APP_CONFIG.USER_KEY, JSON.stringify(user));

      set({ user });

      return { success: true, user };
    } catch (error) {
      console.error('Error refreshing user:', error);
      return { success: false, error:  error.message };
    }
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),
}));