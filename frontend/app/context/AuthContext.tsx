import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Get backend URL from environment or use localhost as fallback
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.31.103:8000';

interface User {
  _id: string;
  username: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, name: string, email: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Load user data from storage on mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username,
        password,
      }, {
        adapter: 'xhr', // Force XHR adapter for React Native
      });

      const { access_token, user: userData } = response.data;

      // Save to state
      setToken(access_token);
      setUser(userData);

      // Save to AsyncStorage
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  const register = async (
    username: string,
    password: string,
    name: string,
    email: string,
    role: string
  ) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        username,
        password,
        name,
        email,
        role,
      }, {
        adapter: 'xhr', // Force XHR adapter for React Native
      });

      const { access_token, user: userData } = response.data;

      // Save to state
      setToken(access_token);
      setUser(userData);

      // Save to AsyncStorage
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      // Clear state
      setToken(null);
      setUser(null);

      // Clear AsyncStorage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');

      // Clear axios header
      delete axios.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
