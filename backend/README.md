# Music App Backend API

REST API backend cho ứng dụng nghe nhạc, được xây dựng với Node.js, Express và MySQL.

## 📋 Yêu cầu

- Node.js >= 14.x
- MySQL >= 8.0
- npm hoặc yarn

## 🚀 Cài đặt

1. **Clone repository và di chuyển vào thư mục backend:**
   ```bash
   cd backend
   ```

2. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

3. **Tạo database:**
   - Chạy SQL script để tạo database (xem file database schema đã cung cấp)
   - Hoặc import file SQL

4. **Cấu hình environment:**
   ```bash
   cp .env.template .env
   ```
   
   Chỉnh sửa file `.env` với thông tin của bạn:
   ```
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=music_app_db
   JWT_SECRET=your_secret_key
   ```

5. **Chạy server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📁 Cấu trúc thư mục

```
backend/
├── src/
│   ├── config/          # Cấu hình database, upload
│   ├── controllers/     # Controllers xử lý logic
│   ├── models/          # Models tương tác với database
│   ├── routes/          # API routes
│   ├── middleware/      # Middleware (auth, validation)
│   └── utils/           # Utilities
├── uploads/             # Thư mục chứa files upload
├── server.js            # Entry point
└── package.json
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký user mới
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại
- `PUT /api/auth/change-password` - Đổi mật khẩu

### Users
- `GET /api/users/profile/:id` - Lấy profile user
- `PUT /api/users/profile` - Cập nhật profile
- `GET /api/users` - Lấy danh sách users (Admin)
- `DELETE /api/users/:id` - Xóa user (Admin)

### Songs
- `GET /api/songs` - Lấy danh sách bài hát
- `GET /api/songs/:id` - Lấy chi tiết bài hát
- `GET /api/songs/search?q=keyword` - Tìm kiếm bài hát
- `GET /api/songs/trending` - Bài hát trending
- `POST /api/songs/:id/play` - Phát nhạc (cập nhật lượt nghe)
- `POST /api/songs` - Tạo bài hát mới (Admin)
- `PUT /api/songs/:id` - Cập nhật bài hát (Admin)
- `DELETE /api/songs/:id` - Xóa bài hát (Admin)

### Artists
- `GET /api/artists` - Lấy danh sách nghệ sĩ
- `GET /api/artists/:id` - Lấy chi tiết nghệ sĩ
- `GET /api/artists/search?q=keyword` - Tìm kiếm nghệ sĩ
- `POST /api/artists` - Tạo nghệ sĩ (Admin)
- `PUT /api/artists/:id` - Cập nhật nghệ sĩ (Admin)
- `DELETE /api/artists/:id` - Xóa nghệ sĩ (Admin)

### Albums
- `GET /api/albums` - Lấy danh sách album
- `GET /api/albums/:id` - Lấy chi tiết album
- `GET /api/albums/artist/:artistId` - Lấy albums của nghệ sĩ
- `POST /api/albums` - Tạo album (Admin)
- `PUT /api/albums/:id` - Cập nhật album (Admin)
- `DELETE /api/albums/:id` - Xóa album (Admin)

### Genres
- `GET /api/genres` - Lấy danh sách thể loại
- `GET /api/genres/:id` - Lấy chi tiết thể loại
- `POST /api/genres` - Tạo thể loại (Admin)

### Playlists
- `GET /api/playlists/my-playlists` - Lấy playlists của user
- `GET /api/playlists/:id` - Lấy chi tiết playlist
- `POST /api/playlists` - Tạo playlist mới
- `PUT /api/playlists/:id` - Cập nhật playlist
- `DELETE /api/playlists/:id` - Xóa playlist
- `POST /api/playlists/:id/songs` - Thêm bài hát vào playlist
- `DELETE /api/playlists/:id/songs/:songId` - Xóa bài hát khỏi playlist

### Favorites
- `GET /api/favorites` - Lấy danh sách yêu thích
- `POST /api/favorites` - Thêm vào yêu thích
- `DELETE /api/favorites/:songId` - Xóa khỏi yêu thích
- `GET /api/favorites/check/:songId` - Kiểm tra đã yêu thích chưa

### History
- `GET /api/history` - Lấy lịch sử nghe nhạc
- `GET /api/history/recently-played` - Bài hát nghe gần đây
- `DELETE /api/history/clear` - Xóa lịch sử

### Comments
- `GET /api/comments/song/:songId` - Lấy comments của bài hát
- `POST /api/comments` - Tạo comment mới
- `PUT /api/comments/:id` - Cập nhật comment
- `DELETE /api/comments/:id` - Xóa comment

## 🔐 Authentication

API sử dụng JWT tokens. Để truy cập các protected endpoints:

1. Đăng nhập để nhận token
2. Thêm token vào header:
   ```
   Authorization: Bearer <your_token>
   ```

## 📝 Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Success message"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message"
}
```

## 🛡️ Security

- Passwords được hash với bcrypt
- JWT tokens cho authentication
- Input validation với express-validator
- CORS enabled
- File upload restrictions

## 📦 Dependencies

- **express** - Web framework
- **mysql2** - MySQL client
- **jsonwebtoken** - JWT authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **multer** - File upload
- **cors** - CORS middleware
- **dotenv** - Environment variables

## 👥 Roles

- **user** - User thường (nghe nhạc, tạo playlist, comment)
- **admin** - Quản trị viên (quản lý songs, artists, albums, genres)

