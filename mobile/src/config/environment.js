// environment.js - Quản lý các môi trường khác nhau

/**
 * CẤU HÌNH MÔI TRƯỜNG CHO APP
 * 
 * Bạn có thể dễ dàng chuyển đổi giữa các môi trường bằng cách thay đổi giá trị ENV
 */

// 🔧 CHỌN MÔI TRƯỜNG (chỉ thay đổi dòng này):
const ENV = 'development'; // Options: 'development', 'staging', 'production'

// 📝 Cấu hình cho từng môi trường
const environments = {
  // Môi trường development (local network)
  development: {
    API_BASE_URL: 'http://192.168.3.50:5000/api', // ⚠️ Thay IP này theo máy bạn
    SOCKET_URL: 'http://192.168.3.50:5000',
    ENV_NAME: 'Development',
    DEBUG: true,
  },

  // Môi trường staging (test server)
  staging: {
    API_BASE_URL: 'https://staging-api.yourapp.com/api',
    SOCKET_URL: 'https://staging-api.yourapp.com',
    ENV_NAME: 'Staging',
    DEBUG: true,
  },

  // Môi trường production (server thực tế)
  production: {
    API_BASE_URL: 'https://api.yourapp.com/api',
    SOCKET_URL: 'https://api.yourapp.com',
    ENV_NAME: 'Production',
    DEBUG: false,
  },
};

// Xuất config hiện tại
const config = environments[ENV];

// Log thông tin môi trường (chỉ khi debug)
if (config.DEBUG) {
  console.log('🌐 Environment:', config.ENV_NAME);
  console.log('🔗 API URL:', config.API_BASE_URL);
}

export default config;

// ⚠️ HƯỚNG DẪN SỬ DỤNG:
// 
// 1. Trong file api.js, thay vì hardcode URL:
//    import config from './environment';
//    export const API_BASE_URL = config.API_BASE_URL;
//
// 2. Khi build APK cho production:
//    - Đổi ENV thành 'production'
//    - Chạy: eas build -p android --profile production
//
// 3. Khi test local:
//    - Đổi ENV thành 'development'
//    - Cập nhật IP trong development.API_BASE_URL
//    - Chạy: npx expo start
