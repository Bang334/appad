import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Base URL - Thay đổi theo môi trường của bạn
// Android Emulator: http://10.0.2.2:5000/api
// iOS Simulator: http://localhost:5000/api
// Thiết bị thật (Expo Go): http://YOUR_IP:5000/api

// ⬇️ CHỌN 1 TRONG CÁC URL SAU (bỏ comment dòng cần dùng):

// Cho EXPO GO (điện thoại thật):
export const API_BASE_URL = 'http://192.168.31.105:5000/api'; 

// Cho ANDROID EMULATOR:
// export const API_BASE_URL = 'http://10.0.2.2:5000/api';

// Cho iOS SIMULATOR:
// export const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // Redirect to login (handled by navigation)
    }
    return Promise.reject(error);
  }
);

export default api;

