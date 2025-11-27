# Hướng dẫn cài đặt Video Background cho Profile

## Bước 1: Chạy migration database

Chạy file migration để thêm column `background_video_url` vào bảng users:

```bash
# Windows
cd backend
mysql -u root -p music_app_db < src/migrations/014_add_background_video_url.sql

# Hoặc kết nối vào MySQL và chạy:
USE music_app_db;
source src/migrations/014_add_background_video_url.sql;
```

## Bước 2: Khởi động lại backend server

```bash
cd backend
npm start
```

## Bước 3: Cài đặt dependencies cho mobile (nếu chưa có)

```bash
cd mobile
npm install react-native-webview
```

## Bước 4: Khởi động lại mobile app

```bash
cd mobile
npx expo start
```

## Cách sử dụng

1. Đăng nhập vào app
2. Vào trang Profile (tab cuối cùng)
3. Chọn "Video Background"
4. Nhập URL video YouTube (ví dụ: https://www.youtube.com/watch?v=dQw4w9WgXcQ)
5. Nhấn "Xem trước" để xem video
6. Nếu hài lòng, nhấn "Lưu"

## Tính năng

- ✅ Mọi user đều có thể cài đặt video background cho profile của họ
- ✅ Video YouTube sẽ tự động phát và lặp lại
- ✅ Video sẽ tự động tắt tiếng khi bạn đang nghe nhạc (miniplayer đang chạy)
- ✅ Video sẽ bật tiếng khi bạn không nghe nhạc
- ✅ Có overlay tối để text vẫn dễ đọc
- ✅ Có màn hình xem trước trước khi lưu
- ✅ Có thể xóa video background và quay lại gradient cũ

## API Endpoint mới

### PUT /api/users/background-video
Cập nhật video background URL cho user hiện tại

**Body:**
```json
{
  "background_video_url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cập nhật video background thành công",
  "data": {
    "user_id": 1,
    "username": "user",
    "email": "user@example.com",
    "background_video_url": "https://www.youtube.com/watch?v=VIDEO_ID",
    ...
  }
}
```

## Database Schema

Đã thêm column mới vào bảng `users`:

```sql
ALTER TABLE users 
ADD COLUMN background_video_url VARCHAR(500) DEFAULT NULL 
COMMENT 'YouTube video URL for profile background';
```

## Lưu ý

- Chỉ chấp nhận URL YouTube hợp lệ
- Video sẽ được embed bằng YouTube IFrame API
- Video tự động phát và lặp lại
- Video có thể ảnh hưởng đến hiệu suất nếu kết nối internet chậm

