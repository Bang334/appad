# 🎵 HỆ THỐNG HỘI VIÊN THEO ARTIST

## 📖 Tổng quan

Hệ thống cho phép người dùng đăng ký hội viên riêng cho từng artist với chi phí thấp hơn so với Premium toàn nền tảng. Khi đăng ký hội viên của một artist, người dùng có thể nghe tất cả các bài hát premium của artist đó.

## 🎯 Lợi ích

- **Chi phí thấp hơn**: Giá hội viên artist thường thấp hơn Premium toàn nền tảng
- **Linh hoạt**: Người dùng chỉ cần đăng ký cho các artist yêu thích
- **Dễ tiếp cận**: Giúp khách hàng dễ dàng tiếp cận nhạc premium hơn

## 💾 Database Schema

### Bảng mới: `artist_memberships`
```sql
- membership_id (PK)
- user_id (FK to users)
- artist_id (FK to artists)
- price_paid (Giá đã thanh toán)
- start_date (Ngày bắt đầu)
- expiry_date (Ngày hết hạn)
- status (active, expired, cancelled)
- created_at, updated_at
```

### Cập nhật bảng `artists`
```sql
- membership_price (Giá đăng ký hội viên)
- membership_duration_days (Thời hạn mặc định, ngày)
```

### Cập nhật bảng `revenue_sharing`
```sql
- share_type: Thêm 'artist_membership'
```

## 📡 API Endpoints

### User - Artist Membership

#### 1. Đăng ký hội viên artist
```
POST /api/artists/:artist_id/membership/subscribe
Body: { duration_days?: number }
Response: {
  success: true,
  data: {
    membership_id,
    artist_id,
    artist_name,
    price_paid,
    duration_days,
    expiry_date,
    new_balance
  }
}
```

#### 2. Kiểm tra trạng thái hội viên
```
GET /api/artists/:artist_id/membership/status
Response: {
  success: true,
  data: {
    has_membership: boolean,
    membership: {...},
    artist: {...},
    membership_info: {
      price,
      duration_days
    }
  }
}
```

#### 3. Hủy hội viên
```
POST /api/artists/:artist_id/membership/cancel
Response: {
  success: true,
  message: "Membership cancelled successfully"
}
```

#### 4. Xem danh sách hội viên của mình
```
GET /api/premium/artist-memberships
Response: {
  success: true,
  data: [
    {
      membership_id,
      artist_id,
      artist_name,
      artist_avatar,
      price_paid,
      start_date,
      expiry_date,
      status
    }
  ]
}
```

### Artist - Quản lý hội viên

#### 5. Xem danh sách thành viên
```
GET /api/artists/:artist_id/membership/members?limit=50&offset=0
Response: {
  success: true,
  data: {
    members: [...],
    stats: {
      total_memberships,
      active_members,
      expired_members,
      cancelled_members,
      total_revenue
    }
  }
}
```

#### 6. Cập nhật giá hội viên
```
PUT /api/artists/:artist_id/membership/price
Body: {
  membership_price: number,
  membership_duration_days?: number
}
Response: {
  success: true,
  message: "Membership info updated successfully",
  data: {
    membership_price,
    membership_duration_days
  }
}
```

## 🔄 Luồng hoạt động

### 1. Đăng ký hội viên
```
User → POST /artists/:id/membership/subscribe
  ↓
Kiểm tra balance
  ↓
Trừ tiền từ ví user
  ↓
Tạo membership record
  ↓
Tạo transaction
  ↓
Chia doanh thu 70% artist / 30% platform
  ↓
Cộng tiền vào ví artist
  ↓
Tạo notification cho user và artist
  ↓
Trả về kết quả
```

### 2. Kiểm tra quyền truy cập bài hát
```
User muốn nghe bài hát premium
  ↓
SongModel.checkAccess()
  ↓
Kiểm tra:
  1. Bài hát có phải premium không?
  2. User có Premium toàn nền tảng không?
  3. User đã mua bài hát chưa?
  4. User đã mua album chưa?
  5. User có hội viên của artist này không? ← MỚI
  ↓
Trả về kết quả
```

## 💰 Revenue Sharing

Khi user đăng ký hội viên:
- **70%** → Artist (trả ngay vào ví)
- **30%** → Platform

Tự động tạo record trong `revenue_sharing` với `share_type = 'artist_membership'`

## 📝 Migration

Chạy migration SQL:
```bash
mysql -u username -p database_name < backend/src/migrations/011_add_artist_membership.sql
```

Hoặc chạy trực tiếp trong MySQL:
```sql
-- Xem file: backend/src/migrations/011_add_artist_membership.sql
```

## 🎨 Cách sử dụng

### 1. Artist thiết lập giá hội viên
```javascript
PUT /api/artists/:artist_id/membership/price
{
  "membership_price": 50000,  // 50,000đ
  "membership_duration_days": 30  // 30 ngày
}
```

### 2. User đăng ký hội viên
```javascript
POST /api/artists/:artist_id/membership/subscribe
{
  "duration_days": 30  // Optional, dùng giá mặc định nếu không có
}
```

### 3. User nghe nhạc premium
Khi user có hội viên của artist, họ tự động có quyền nghe tất cả bài hát premium của artist đó.

## ✅ Checklist Implementation

- [x] Tạo migration SQL
- [x] Tạo model `artist-membership.model.js`
- [x] Cập nhật `SongModel.checkAccess()` để kiểm tra artist membership
- [x] Cập nhật `ArtistModel` với methods quản lý membership
- [x] Tạo controller `artist-membership.controller.js`
- [x] Tạo routes cho user và artist
- [x] Tích hợp revenue sharing
- [x] Tạo notifications

## 🔮 Tính năng tương lai (Optional)

- [ ] Auto-renew membership
- [ ] Membership tiers (Basic, Premium, VIP)
- [ ] Gift membership to friends
- [ ] Membership analytics dashboard
- [ ] Email reminders before expiry

