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
  // KHÔNG set headers mặc định - để axios tự xử lý
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
    
    // QUAN TRỌNG: Nếu data là FormData, KHÔNG set Content-Type
    // Để React Native / Axios tự động thêm boundary
    if (!(config.data instanceof FormData)) {
      // Chỉ set Content-Type cho non-FormData requests
      config.headers['Content-Type'] = 'application/json';
    }
    
    // DEBUG: Log request details
    console.log(`\n🚀 [AXIOS] ${config.method?.toUpperCase()} ${config.url}`);
    console.log(`   isFormData: ${config.data instanceof FormData}`);
    console.log(`   Content-Type: ${config.headers['Content-Type'] || 'NOT SET (good for FormData)'}`);
    
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
