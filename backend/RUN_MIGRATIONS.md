# 🚀 Hướng dẫn chạy Database Migrations

## Cách 1: Sử dụng MySQL Command Line (Khuyến nghị)

### Bước 1: Kết nối MySQL
```bash
# Trên Windows (PowerShell hoặc CMD)
mysql -u root -p

# Sau đó chọn database
USE music_app_db;
```

### Bước 2: Chạy từng file migration
```bash
# Cập nhật artists table
SOURCE E:/appad/backend/src/migrations/004_add_artist_wallet_fields.sql;

# Tạo bảng transactions
SOURCE E:/appad/backend/src/migrations/005_create_transactions_table.sql;

# Tạo bảng revenue_sharing (QUAN TRỌNG)
SOURCE E:/appad/backend/src/migrations/006_create_revenue_sharing_table.sql;

# Tạo bảng premium_listening_stats
SOURCE E:/appad/backend/src/migrations/007_create_premium_listening_stats_table.sql;

# Tạo bảng artist_withdrawals
SOURCE E:/appad/backend/src/migrations/008_create_artist_withdrawals_table.sql;

# Tạo bảng platform_revenue
SOURCE E:/appad/backend/src/migrations/009_create_platform_revenue_table.sql;
```

### Bước 3: Kiểm tra
```sql
-- Xem tất cả bảng
SHOW TABLES;

-- Kiểm tra cấu trúc artists
DESCRIBE artists;

-- Kiểm tra transactions
DESCRIBE transactions;

-- Kiểm tra revenue_sharing
DESCRIBE revenue_sharing;

-- Kiểm tra premium_listening_stats
DESCRIBE premium_listening_stats;

-- Kiểm tra artist_withdrawals
DESCRIBE artist_withdrawals;

-- Kiểm tra platform_revenue
DESCRIBE platform_revenue;
```

---

## Cách 2: Sử dụng MySQL Workbench

1. Mở MySQL Workbench
2. Kết nối đến database `music_app_db`
3. Mở từng file .sql trong thư mục `backend/src/migrations/`
4. Click nút "Execute" (⚡) để chạy
5. Chạy theo thứ tự từ 004 → 009

---

## Cách 3: Copy-Paste trực tiếp vào MySQL

Nếu không muốn dùng SOURCE, bạn có thể:
1. Mở file .sql bằng text editor
2. Copy toàn bộ nội dung
3. Paste vào MySQL command line hoặc Workbench
4. Nhấn Enter để execute

---

## ⚠️ Lưu ý quan trọng

1. **Chạy theo đúng thứ tự** từ 004 → 009
2. **Backup database trước** khi chạy:
   ```bash
   mysqldump -u root -p music_app_db > backup_before_revenue_system.sql
   ```
3. Nếu gặp lỗi "table already exists", có thể bỏ qua (đã tạo rồi)
4. Nếu gặp lỗi foreign key, kiểm tra các bảng cha đã tồn tại chưa

---

## 🔍 Test sau khi chạy xong

```sql
-- Test insert vào artists
UPDATE artists SET balance = 0, total_earned = 0 WHERE artist_id = 1;

-- Test insert vào transactions
INSERT INTO transactions (user_id, type, amount, status, description)
VALUES (1, 'purchase', 10000, 'completed', 'Test purchase');

-- Test insert vào revenue_sharing
INSERT INTO revenue_sharing (
  artist_id, user_id, song_id, share_type, 
  total_amount, artist_share, platform_share
)
VALUES (1, 1, 1, 'direct_purchase', 10000, 7000, 3000);

-- Kiểm tra data
SELECT * FROM transactions LIMIT 5;
SELECT * FROM revenue_sharing LIMIT 5;
```

---

## ❌ Rollback nếu cần

Nếu muốn xóa các bảng mới và reset:

```sql
-- XÓA CÁC BẢNG MỚI (thận trọng!)
DROP TABLE IF EXISTS platform_revenue;
DROP TABLE IF EXISTS artist_withdrawals;
DROP TABLE IF EXISTS premium_listening_stats;
DROP TABLE IF EXISTS revenue_sharing;
DROP TABLE IF EXISTS transactions;

-- XÓA CÁC FIELDS MỚI TRONG ARTISTS
ALTER TABLE artists
DROP COLUMN balance,
DROP COLUMN total_earned,
DROP COLUMN total_withdrawn,
DROP COLUMN bank_name,
DROP COLUMN bank_account,
DROP COLUMN bank_account_name,
DROP COLUMN created_at,
DROP COLUMN updated_at;
```

---

## 📞 Hỗ trợ

Nếu gặp lỗi, kiểm tra:
1. MySQL version >= 5.7
2. User có quyền CREATE TABLE, ALTER TABLE
3. Database `music_app_db` đã tồn tại
4. Các bảng cơ bản (users, artists, songs) đã có sẵn

