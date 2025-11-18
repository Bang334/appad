# Music App Mobile

Ứng dụng nghe nhạc mobile được xây dựng với React Native và Expo.

## 📋 Yêu cầu

- Node.js >= 14.x
- npm hoặc yarn
- Expo CLI
- Android Studio hoặc Xcode (để chạy trên emulator)

## 🚀 Cài đặt

1. **Di chuyển vào thư mục mobile:**
   ```bash
   cd mobile
   ```

2. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

3. **Cấu hình API:**
   - Mở file `src/config/api.js`
   - Thay đổi `API_BASE_URL` thành địa chỉ backend của bạn
   ```javascript
   export const API_BASE_URL = 'http://YOUR_IP:5000/api';
   ```

4. **Chạy ứng dụng:**
   ```bash
   # Khởi động Expo
   npm start

   # Chạy trên Android
   npm run android

   # Chạy trên iOS (chỉ MacOS)
   npm run ios
   ```

## 📁 Cấu trúc thư mục

```
mobile/
├── src/
│   ├── components/      # Components tái sử dụng
│   │   └── Player/      # Music player components
│   ├── config/          # Cấu hình (API, theme)
│   ├── context/         # React Context (Auth, Player)
│   ├── navigation/      # Navigation setup
│   ├── screens/         # Màn hình chính
│   │   ├── Auth/        # Login, Register
│   │   ├── Home/        # Trang chủ
│   │   ├── Search/      # Tìm kiếm
│   │   ├── Library/     # Thư viện
│   │   └── Profile/     # Hồ sơ người dùng
│   ├── services/        # API services
│   └── utils/           # Utilities
├── assets/              # Hình ảnh, fonts
├── App.js              # Entry point
├── app.json            # Expo config
└── package.json
```

## ✨ Tính năng

### Đã hoàn thành
- ✅ Đăng nhập / Đăng ký
- ✅ Trang chủ với trending songs
- ✅ Tìm kiếm bài hát
- ✅ Phát nhạc cơ bản
- ✅ Mini player
- ✅ Thư viện (Yêu thích, Playlist)
- ✅ Hồ sơ người dùng
- ✅ Authentication với JWT

### Music Player
- ✅ Phát/Tạm dừng
- ✅ Chuyển bài (Next/Previous)
- ✅ Mini player ở bottom tab
- ⏳ Full player screen (chưa hoàn thành)
- ⏳ Seek bar / Progress bar
- ⏳ Shuffle & Repeat

### Tính năng khác
- ⏳ Thêm/Xóa yêu thích
- ⏳ Tạo/Quản lý playlist
- ⏳ Lịch sử nghe nhạc
- ⏳ Comment bài hát
- ⏳ Theo dõi nghệ sĩ

## 🎨 Theme & Design

- **Color Scheme:** Dark theme với màu chủ đạo Indigo/Purple
- **Typography:** San-serif mặc định của React Native
- **Icons:** Ionicons từ @expo/vector-icons

### Colors
```javascript
primary: '#6366f1'      // Indigo
secondary: '#8b5cf6'    // Purple
background: '#0f0f0f'   // Near black
surface: '#1a1a1a'      // Dark gray
text: '#ffffff'         // White
```

## 📱 Navigation

### Auth Stack
- Login Screen
- Register Screen

### Main Tab Navigator
- Home (Trang chủ)
- Search (Tìm kiếm)
- Library (Thư viện)
- Profile (Cá nhân)

## 🔧 API Integration

Ứng dụng kết nối với backend API thông qua axios:

```javascript
// services/songService.js
import api from '../config/api';

export const songService = {
  getAllSongs: async (limit, offset) => { ... },
  searchSongs: async (keyword) => { ... },
  getTrendingSongs: async (limit) => { ... },
  playSong: async (songId) => { ... },
};
```

## 📦 Dependencies chính

- **expo** - Framework React Native
- **@react-navigation** - Navigation
- **axios** - HTTP client
- **expo-av** - Audio/Video playback
- **@react-native-async-storage** - Local storage
- **expo-linear-gradient** - Gradient components

## 🔐 Authentication

Authentication được quản lý bởi `AuthContext`:

```javascript
const { user, login, logout, isAuthenticated } = useAuth();
```

Token được lưu trong AsyncStorage và tự động thêm vào mọi API request.

## 🎵 Music Player

Music player được quản lý bởi `PlayerContext`:

```javascript
const { 
  currentSong, 
  isPlaying, 
  playSong, 
  togglePlayPause,
  playNext,
  playPrevious 
} = usePlayer();
```

## 🚧 Lưu ý

- Đảm bảo backend API đang chạy trước khi sử dụng app
- Cập nhật `API_BASE_URL` trong `src/config/api.js`
- Trên Android emulator, sử dụng `10.0.2.2` thay vì `localhost`
- Trên iOS simulator, có thể dùng `localhost`
- Trên thiết bị thực, dùng IP của máy chạy backend

## 📝 TODO

- [ ] Hoàn thiện Full Player Screen
- [ ] Thêm Progress Bar / Seek Bar
- [ ] Playlist management
- [ ] Download offline
- [ ] Dark/Light theme toggle
- [ ] Multi-language support

## 🐛 Debug

Nếu gặp lỗi khi chạy app:

1. **Clear cache:**
   ```bash
   expo start -c
   ```

2. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **Check API connection:**
   - Kiểm tra backend đang chạy
   - Kiểm tra `API_BASE_URL` đúng
   - Kiểm tra CORS được enable ở backend

## 📄 License

MIT

