# 🎵 Music App - Ứng dụng Nghe Nhạc

Ứng dụng nghe nhạc hoàn chỉnh với backend API (Node.js/Express) và mobile app (React Native/Expo).

## 📋 Tổng quan

Dự án bao gồm 2 phần chính:
- **Backend API**: RESTful API được xây dựng với Node.js, Express và MySQL
- **Mobile App**: Ứng dụng di động cross-platform (iOS & Android) với React Native và Expo

## 🏗️ Kiến trúc

```
music-app/
├── backend/              # Backend API (Node.js + Express + MySQL)
│   ├── src/
│   │   ├── config/      # Database, upload config
│   │   ├── controllers/ # Request handlers
│   │   ├── models/      # Database models
│   │   ├── routes/      # API routes
│   │   └── middleware/  # Auth, validation
│   ├── uploads/         # File uploads
│   └── server.js        # Entry point
│
└── mobile/              # Mobile App (React Native + Expo)
    ├── src/
    │   ├── components/  # Reusable components
    │   ├── config/      # API, theme config
    │   ├── context/     # Auth, Player context
    │   ├── navigation/  # App navigation
    │   ├── screens/     # App screens
    │   ├── services/    # API services
    │   └── utils/       # Utilities
    └── App.js           # Entry point
```

## 🗄️ Database Schema

### Tables
1. **users** - Thông tin người dùng
2. **artists** - Nghệ sĩ
3. **genres** - Thể loại nhạc
4. **albums** - Albums
5. **songs** - Bài hát
6. **playlists** - Playlist của user
7. **playlist_songs** - Bài hát trong playlist
8. **favorites** - Bài hát yêu thích
9. **listening_history** - Lịch sử nghe nhạc
10. **comments** - Bình luận
11. **follows** - Theo dõi nghệ sĩ

## ✨ Tính năng

### Backend API
- ✅ Authentication (JWT)
- ✅ User management
- ✅ Song CRUD operations
- ✅ Artist & Album management
- ✅ Genre management
- ✅ Playlist management
- ✅ Favorites system
- ✅ Listening history
- ✅ Comments system
- ✅ Search functionality
- ✅ Trending songs
- ✅ File upload (songs, images)

### Mobile App
- ✅ User authentication
- ✅ Browse songs & trending
- ✅ Search songs
- ✅ Music player (play, pause, next, previous)
- ✅ Mini player
- ✅ Library (favorites, playlists)
- ✅ User profile
- ⏳ Full player screen
- ⏳ Playlist management
- ⏳ Comments

## 🚀 Cài đặt

### 1. Database Setup

```sql
-- Tạo database
CREATE DATABASE music_app_db;

-- Import schema (sử dụng SQL schema đã cung cấp)
```

### 2. Backend Setup

```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt dependencies
npm install

# Tạo file .env từ template
cp .env.template .env

# Chỉnh sửa file .env với thông tin của bạn
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=music_app_db
# JWT_SECRET=your_secret_key

# Chạy server
npm run dev
```

Server sẽ chạy tại: `http://localhost:5000`

### 3. Mobile App Setup

```bash
# Di chuyển vào thư mục mobile
cd mobile

# Cài đặt dependencies
npm install

# Cập nhật API URL trong src/config/api.js
# export const API_BASE_URL = 'http://YOUR_IP:5000/api';

# Chạy app
npm start

# Hoặc chạy trực tiếp trên platform
npm run android  # Android
npm run ios      # iOS (MacOS only)
```

## 🔧 Cấu hình

### Backend Environment Variables

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=music_app_db
DB_PORT=3306

JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

CORS_ORIGIN=*
```

### Mobile API Configuration

Trong file `mobile/src/config/api.js`:

```javascript
// Localhost (iOS Simulator)
export const API_BASE_URL = 'http://localhost:5000/api';

// Android Emulator
export const API_BASE_URL = 'http://10.0.2.2:5000/api';

// Thiết bị thật (sử dụng IP máy chạy backend)
export const API_BASE_URL = 'http://192.168.1.X:5000/api';
```

## 📚 API Documentation

### Authentication
```
POST   /api/auth/register       - Đăng ký
POST   /api/auth/login          - Đăng nhập
GET    /api/auth/me             - Lấy thông tin user hiện tại
PUT    /api/auth/change-password - Đổi mật khẩu
```

### Songs
```
GET    /api/songs               - Lấy danh sách bài hát
GET    /api/songs/:id           - Lấy chi tiết bài hát
GET    /api/songs/search        - Tìm kiếm bài hát
GET    /api/songs/trending      - Bài hát trending
POST   /api/songs/:id/play      - Phát nhạc
POST   /api/songs               - Tạo bài hát (Admin)
PUT    /api/songs/:id           - Cập nhật bài hát (Admin)
DELETE /api/songs/:id           - Xóa bài hát (Admin)
```

### Playlists
```
GET    /api/playlists/my-playlists      - Lấy playlist của user
GET    /api/playlists/:id               - Lấy chi tiết playlist
POST   /api/playlists                   - Tạo playlist
PUT    /api/playlists/:id               - Cập nhật playlist
DELETE /api/playlists/:id               - Xóa playlist
POST   /api/playlists/:id/songs         - Thêm bài hát vào playlist
DELETE /api/playlists/:id/songs/:songId - Xóa bài hát khỏi playlist
```

Xem full API documentation trong [backend/README.md](backend/README.md)

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL** - Database
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File upload

### Mobile
- **React Native** - UI framework
- **Expo** - Development platform
- **React Navigation** - Navigation
- **Axios** - HTTP client
- **Expo AV** - Audio playback
- **AsyncStorage** - Local storage

## 📱 Screenshots

(Thêm screenshots ở đây sau khi có UI)

## 🔐 Security

- Passwords được hash với bcrypt
- JWT tokens cho authentication
- Input validation
- SQL injection prevention
- File upload validation
- CORS protection

## 🎨 Design

- **Color Scheme**: Dark theme với gradient Indigo/Purple
- **Typography**: System fonts
- **Icons**: Ionicons
- **Layout**: Bottom tab navigation với mini player

## 📝 TODO & Roadmap

### Backend
- [ ] Rate limiting
- [ ] Email verification
- [ ] Password reset
- [ ] Social login
- [ ] Admin dashboard
- [ ] Analytics

### Mobile
- [ ] Full player screen
- [ ] Lyrics display
- [ ] Equalizer
- [ ] Sleep timer
- [ ] Download offline
- [ ] Share songs
- [ ] Dark/Light theme toggle

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License

## 👥 Authors

- Your Name

## 🙏 Acknowledgments

- Expo team for amazing tools
- React Navigation for routing solution
- All open source contributors

---

**Happy Coding! 🎵**
