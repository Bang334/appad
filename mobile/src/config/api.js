import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from './environment';

// API Base URL - Được quản lý tập trung trong environment.js
// Để thay đổi môi trường, chỉnh sửa file src/config/environment.js
export const API_BASE_URL = config.API_BASE_URL;


// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Tăng timeout lên 60s
  headers: {
    'Content-Type': 'application/json',
  },
  // Quan trọng: transformRequest để ngăn axios serialize FormData
  transformRequest: [
    (data, headers) => {
      if (data instanceof FormData) {
        // Nếu là FormData, để React Native tự xử lý Content-Type (kèm boundary)
        // Chúng ta xóa header Content-Type nếu nó đã được set là application/json
        if (headers['Content-Type'] === 'application/json') {
          delete headers['Content-Type'];
        }
        return data;
      }
      return JSON.stringify(data);
    },
  ],
});

// Log API config for debugging
console.log('API Base URL:', API_BASE_URL);

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

