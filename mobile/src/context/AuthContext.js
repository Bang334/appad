import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, ...userData } = response.data.data;
      
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      setToken(token);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (
    username,
    email,
    password,
    full_name,
    artist_register = false,
    artist_bio = '',
    artist_country = '',
    artist_image_url = '',
  ) => {
    try {
      console.log('Register attempt:', { username, email, apiUrl: api.defaults.baseURL });
      
      const response = await api.post('/auth/register', {
        username,
        email,
        password,
        full_name,
        artist_register,
        artist_bio,
        artist_country,
        artist_image_url,
      });
      
      console.log('Register response:', response.data);
      
      if (response.data.success && response.data.data) {
        const { token, ...userData } = response.data.data;
        
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        
        setToken(token);
        setUser(userData);
        
        return { success: true };
      } else {
        return {
          success: false,
          message: response.data.message || 'Registration failed'
        };
      }
    } catch (error) {
      console.error('Register error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
      
      // Handle network errors
      if (error.message === 'Network Error' || error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        return {
          success: false,
          message: `Không thể kết nối đến server.\nVui lòng kiểm tra:\n- Server đang chạy\n- IP: ${api.defaults.baseURL}\n- Cùng mạng WiFi`
        };
      }
      
      // Handle validation errors
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const errorMessages = error.response.data.errors.map(err => err.message).join('\n');
        return {
          success: false,
          message: errorMessages || 'Validation failed'
        };
      }
      
      // Handle other errors
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Registration failed. Please check your connection.'
      };
    }
  };

  const logout = async () => {
    try {
      // Clear all AsyncStorage items (cache)
      const allKeys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(allKeys);
      
      // Clear state
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      // Fallback: at least clear auth items
      try {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      } catch (fallbackError) {
        console.error('Error clearing auth items:', fallbackError);
      }
    }
  };

  const updateUser = async (userData) => {
    try {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

