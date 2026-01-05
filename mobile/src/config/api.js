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
    const originalRequest = error.config;

    // Retry logic for Network Error (Cold Start fix)
    // Checks for 'Network Error' message which is typical for connection refused/timeout in RN
    if (error.message === 'Network Error' && originalRequest) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      if (originalRequest._retryCount <= 3) {
        console.log(`⚠️ Network Error - Auto-retrying request (${originalRequest._retryCount}/3)...`);
        
        // Exponential backoff or simple delay
        const delay = 1000 * originalRequest._retryCount; 
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return api(originalRequest);
      }
    }

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
