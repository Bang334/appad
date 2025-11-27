# Database Schema cho Revenue Sharing System

## 📋 Tổng quan các bảng mới

### 1. **artists** (Cập nhật)
Thêm các fields để quản lý ví và thông tin thanh toán cho artist.

**Fields mới:**
- `balance` - Số dư hiện tại của artist
- `total_earned` - Tổng tiền đã kiếm được
- `total_withdrawn` - Tổng tiền đã rút
- `bank_name` - Tên ngân hàng
- `bank_account` - Số tài khoản
- `bank_account_name` - Tên chủ tài khoản
- `created_at`, `updated_at` - Timestamps

---

### 2. **transactions** (Mới)
Lưu lịch sử giao dịch của users (nạp tiền, mua bài, đăng ký premium).

**Columns:**
- `transaction_id` - PK
- `user_id` - FK to users
- `type` - ENUM: 'deposit', 'purchase', 'subscription'
- `amount` - Số tiền giao dịch
- `status` - ENUM: 'pending', 'completed', 'cancelled'
- `description` - Mô tả giao dịch
- `reference_code` - Mã tham chiếu (cho nạp tiền QR)
- `created_at`, `updated_at`

**Indexes:**
- idx_user_type (user_id, type)
- idx_reference (reference_code)
- idx_status (status)

---

### 3. **revenue_sharing** (Mới) ⭐ QUAN TRỌNG NHẤT
Theo dõi chia doanh thu giữa artist (70%) và platform (30%).

**Columns:**
- `sharing_id` - PK
- `transaction_id` - FK to transactions (nullable)
- `purchase_id` - FK to purchased_songs (nullable)
- `artist_id` - FK to artists (NOT NULL)
- `user_id` - FK to users (NOT NULL)
- `song_id` - FK to songs (nullable)

**Loại chia sẻ:**
- `share_type` - ENUM: 'direct_purchase', 'premium_stream'

**Số tiền:**
- `total_amount` - Tổng tiền giao dịch
- `artist_share` - Phần artist nhận (VD: 7,000đ)
- `artist_percentage` - % artist (default 70%)
- `platform_share` - Phần platform nhận (VD: 3,000đ)
- `platform_percentage` - % platform (default 30%)

**Premium stream info:**
- `calculation_period` - Tháng tính toán (VD: '2025-01')
- `stream_count` - Số lượt nghe
- `listen_duration` - Tổng thời gian nghe (giây)

**Trạng thái:**
- `is_paid_to_artist` - Đã trả cho artist chưa (0/1)
- `paid_at` - Ngày trả tiền

**Indexes:**
- idx_artist_period (artist_id, calculation_period)
- idx_artist_type (artist_id, share_type)
- idx_paid (is_paid_to_artist)

---

### 4. **premium_listening_stats** (Mới)
Thống kê lượt nghe premium songs để tính revenue share hàng tháng.

**Columns:**
- `stat_id` - PK
- `user_id` - User premium đang nghe
- `song_id` - Bài hát được nghe
- `artist_id` - Artist của bài hát
- `listen_date` - Ngày nghe
- `listen_count` - Số lần nghe trong ngày
- `total_duration` - Tổng thời gian nghe (giây)
- `completed_count` - Số lần nghe hết bài
- `engagement_score` - Điểm engagement

**UNIQUE constraint:**
- (user_id, song_id, listen_date) - Mỗi user/bài/ngày chỉ có 1 record

**Indexes:**
- idx_period (listen_date)
- idx_artist_period (artist_id, listen_date)
- idx_user_period (user_id, listen_date)

---

### 5. **artist_withdrawals** (Mới)
Quản lý yêu cầu rút tiền của artists.

**Columns:**
- `withdrawal_id` - PK
- `artist_id` - FK to artists
- `amount` - Số tiền rút
- `fee` - Phí rút tiền
- `actual_amount` - Số tiền thực nhận (amount - fee)
- `bank_name`, `bank_account`, `bank_account_name`
- `status` - ENUM: 'pending', 'processing', 'completed', 'rejected'
- `artist_note`, `admin_note`
- `requested_at`, `processed_at`
- `processed_by` - Admin xử lý

**Indexes:**
- idx_artist (artist_id)
- idx_status (status)

---

### 6. **platform_revenue** (Mới)
Theo dõi doanh thu của platform (30% commission).

**Columns:**
- `revenue_id` - PK
- `sharing_id` - FK to revenue_sharing
- `transaction_id` - FK to transactions
- `revenue_type` - ENUM: 'direct_purchase', 'premium_subscription', 'premium_stream'
- `amount` - Số tiền platform nhận
- `percentage` - % platform (default 30%)
- `period` - Kỳ tính toán (YYYY-MM)
- `received_at`
- `metadata` - JSON (thông tin bổ sung)

---

## 📊 Luồng dữ liệu

### A. Mua bài hát trực tiếp (Direct Purchase)

```
User mua bài 10,000đ
↓
1. transactions: 
   - type='purchase', amount=10,000, status='completed'
↓
2. purchased_songs:
   - user_id, song_id, price_paid=10,000
↓
3. revenue_sharing:
   - share_type='direct_purchase'
   - total_amount=10,000
   - artist_share=7,000 (70%)
   - platform_share=3,000 (30%)
   - is_paid_to_artist=1 (trả ngay lập tức)
↓
4. artists.balance += 7,000
5. artists.total_earned += 7,000
↓
6. platform_revenue:
   - amount=3,000
```

### B. Đăng ký Premium (Subscription)

```
User đăng ký Premium 99,000đ
↓
1. transactions:
   - type='subscription', amount=99,000, status='completed'
↓
2. users:
   - is_premium=1
   - premium_expiry = NOW() + 30 days
↓
3. User nghe nhạc → Ghi vào premium_listening_stats
↓
4. Cuối tháng: Chạy batch job tính revenue sharing
   - Tính tổng stream của mỗi artist
   - Chia 70% của 99,000đ theo tỷ lệ stream
↓
5. Tạo records trong revenue_sharing
   - share_type='premium_stream'
   - calculation_period='2025-01'
   - is_paid_to_artist=0 (chờ trả)
↓
6. Admin approve → Trả tiền cho artists
   - artists.balance += artist_share
   - is_paid_to_artist=1
```

---

## 🎯 Công thức tính Revenue Share

### 1. Direct Purchase (Mua trực tiếp)
```sql
artist_share = price * 0.70
platform_share = price * 0.30
```

### 2. Premium Stream (Theo lượt nghe)
```sql
-- Bước 1: Tính artist pool từ tất cả premium subscriptions trong tháng
total_premium_revenue = SUM(subscription_amount) 
artist_pool = total_premium_revenue * 0.70
platform_pool = total_premium_revenue * 0.30

-- Bước 2: Tính stream share của mỗi artist
artist_total_streams = SUM(listen_count) WHERE artist_id = X AND period = 'YYYY-MM'
all_streams = SUM(listen_count) WHERE period = 'YYYY-MM'

artist_stream_percentage = artist_total_streams / all_streams

-- Bước 3: Tính tiền
artist_revenue = artist_pool * artist_stream_percentage
```

**Ví dụ:**
- Tháng 1/2025: 10 users đăng ký premium (10 * 99,000 = 990,000đ)
- Artist pool = 990,000 * 0.70 = 693,000đ
- Artist A được nghe 500 lượt / Tổng 2000 lượt = 25%
- Artist A nhận = 693,000 * 25% = 173,250đ

---

## 🔄 Cách chạy migrations

1. Kết nối MySQL:
```bash
mysql -u root -p music_app_db
```

2. Chạy từng file migration theo thứ tự:
```bash
source backend/src/migrations/004_add_artist_wallet_fields.sql;
source backend/src/migrations/005_create_transactions_table.sql;
source backend/src/migrations/006_create_revenue_sharing_table.sql;
source backend/src/migrations/007_create_premium_listening_stats_table.sql;
source backend/src/migrations/008_create_artist_withdrawals_table.sql;
source backend/src/migrations/009_create_platform_revenue_table.sql;
```

Hoặc chạy script tự động:
```bash
node backend/src/migrations/run_migrations.js
```

---

## ✅ Checklist sau khi chạy migrations

- [ ] Kiểm tra artists có các fields mới (balance, bank_account, etc)
- [ ] Kiểm tra bảng transactions được tạo
- [ ] Kiểm tra bảng revenue_sharing được tạo (quan trọng nhất)
- [ ] Kiểm tra bảng premium_listening_stats được tạo
- [ ] Kiểm tra bảng artist_withdrawals được tạo
- [ ] Kiểm tra bảng platform_revenue được tạo
- [ ] Kiểm tra tất cả foreign keys hoạt động đúng
- [ ] Test insert data mẫu vào các bảng

