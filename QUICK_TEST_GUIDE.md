# 🧪 HƯỚNG DẪN TEST NHANH

## ✅ Checklist Test

### 1. Test Backend APIs (dùng Postman hoặc curl)

#### a) Test Health Check
```bash
GET http://localhost:5000/api/health
```
✅ Expect: `{ status: "OK", message: "Music App API is running" }`

#### b) Test Login
```bash
POST http://localhost:5000/api/auth/login
Body: {
  "email": "user@email.com",
  "password": "password"
}
```
✅ Expect: Token để dùng cho các request tiếp theo

#### c) Test Wallet Balance
```bash
GET http://localhost:5000/api/wallet/balance
Header: Authorization: Bearer YOUR_TOKEN
```
✅ Expect: `{ success: true, data: { balance: 0 } }`

#### d) Test Nạp tiền
```bash
POST http://localhost:5000/api/wallet/topup
Header: Authorization: Bearer YOUR_TOKEN
Body: { "amount": 100000 }
```
✅ Expect: QR code URL VietComBank + reference code

#### e) Test Mua bài hát
```bash
# Trước tiên cần confirm nạp tiền để có balance
POST http://localhost:5000/api/wallet/confirm
Body: { "reference_code": "MUSIC..." }

# Sau đó mua bài
POST http://localhost:5000/api/premium/purchase
Header: Authorization: Bearer YOUR_TOKEN
Body: { "song_id": 1 }
```
✅ Expect: Success + new_balance
✅ Check DB: `revenue_sharing` có record mới với artist_share = 70%

#### f) Test Artist Balance
```bash
GET http://localhost:5000/api/artists/1/balance
Header: Authorization: Bearer YOUR_TOKEN
```
✅ Expect: Artist balance đã tăng 70% từ purchase

---

### 2. Test Database

#### Check Revenue Sharing
```sql
-- Xem records chia doanh thu
SELECT * FROM revenue_sharing ORDER BY created_at DESC LIMIT 10;

-- Xem artist đã kiếm được bao nhiêu
SELECT 
  a.name,
  a.balance,
  a.total_earned,
  COUNT(rs.sharing_id) as transactions,
  SUM(rs.artist_share) as total_share
FROM artists a
LEFT JOIN revenue_sharing rs ON a.artist_id = rs.artist_id
GROUP BY a.artist_id;
```

#### Check Transactions
```sql
-- Xem giao dịch users
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;

-- Xem premium listening stats
SELECT * FROM premium_listening_stats ORDER BY listen_date DESC LIMIT 10;

-- Xem withdrawal requests
SELECT * FROM artist_withdrawals ORDER BY requested_at DESC;
```

---

### 3. Test Mobile App

#### a) Test Premium Flow
```
1. Mở app → Login
2. HomeScreen → Tìm bài có badge PREMIUM
3. Click play → Modal "Mua bài hát" hiện ra
4. Check số dư hiển thị đúng
5. Nếu thiếu → Click link "Nạp tiền"
6. WalletScreen hiện ra → Click "Nạp tiền"
7. TopUpScreen → Nhập 100000 → QR hiện ra
8. (Giả lập) Back và confirm transaction trong DB
9. Quay lại mua bài → Success!
10. Play bài → Nghe được không giới hạn
```

#### b) Test Premium Subscription
```
1. Profile → Premium
2. Check giá hiển thị: 99,000đ
3. Check số dư ví hiển thị
4. Click "Đăng ký ngay"
5. Confirm → Success
6. Quay lại HomeScreen
7. Play bất kỳ premium song → Nghe được hết
```

#### c) Test Artist Dashboard
```
1. Vào ArtistDetailScreen (click vào artist)
2. Click "Dashboard" button
3. Check:
   - Số dư hiển thị đúng
   - Stats đầy đủ
   - Revenue history có data
4. Click "Rút tiền"
5. Nhập bank info (nếu chưa có)
6. Nhập số tiền 50000
7. Submit → Success
8. Check lịch sử rút → Status "Chờ duyệt"
```

#### d) Test Admin Withdrawal
```
1. Login as admin
2. Admin Dashboard → "Quản lý rút tiền"
3. Xem danh sách pending
4. Click "Duyệt" trên 1 yêu cầu
5. Confirm → Success
6. Check artist balance giảm
7. Check withdrawal status = completed
```

---

### 4. Test Data để Insert

#### Thêm premium songs:
```sql
UPDATE songs SET is_premium = 1, price = 15000 WHERE song_id IN (1, 2, 3);
UPDATE songs SET is_premium = 1, price = 20000 WHERE song_id IN (4, 5);
```

#### Thêm balance cho user test:
```sql
UPDATE users SET balance = 500000 WHERE user_id = 1;
```

#### Check tất cả:
```sql
-- User có premium không
SELECT user_id, username, is_premium, premium_expiry, balance FROM users;

-- Songs nào premium
SELECT song_id, title, is_premium, price FROM songs WHERE is_premium = 1;

-- Artist balance
SELECT artist_id, name, balance, total_earned FROM artists;
```

---

## 🎯 Expected Results

### Sau khi user mua bài 10,000đ:

**User:**
- balance giảm 10,000đ
- purchased_songs có record mới
- Có thể play bài không giới hạn

**Artist:**
- balance tăng 7,000đ (70%)
- total_earned tăng 7,000đ

**Platform:**
- platform_revenue ghi nhận 3,000đ (30%)

**Revenue Sharing:**
```sql
SELECT * FROM revenue_sharing WHERE share_type = 'direct_purchase';
-- total_amount: 10000
-- artist_share: 7000
-- platform_share: 3000
-- is_paid_to_artist: 1
```

### Sau khi user subscribe premium 99,000đ:

**User:**
- balance giảm 99,000đ
- is_premium = 1
- premium_expiry = NOW() + 30 days
- Có thể nghe tất cả premium songs

**Khi user nghe premium songs:**
```sql
SELECT * FROM premium_listening_stats;
-- Mỗi lượt nghe được ghi nhận
-- Dùng để tính revenue cuối tháng
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Insufficient balance"
**Solution:** Chạy SQL:
```sql
UPDATE users SET balance = 500000 WHERE user_id = 1;
```

### Issue 2: "Song not premium"
**Solution:**
```sql
UPDATE songs SET is_premium = 1, price = 15000 WHERE song_id = 1;
```

### Issue 3: Artist không có balance
**Solution:** Có thể do:
- Chưa có ai mua bài của artist
- Revenue chưa được trả (premium stream)
- Check: `SELECT * FROM revenue_sharing WHERE artist_id = X;`

### Issue 4: QR code không hiện
**Solution:** Check internet connection, VietQR API working

---

## 🎉 Success Indicators

✅ Backend server chạy không lỗi
✅ Mobile app connect được backend
✅ User có thể nạp tiền
✅ Premium badge hiển thị đẹp
✅ Modal mua bài hoạt động
✅ Revenue tự động chia 70/30
✅ Artist dashboard load được data
✅ Admin có thể duyệt withdrawal

**HỆ THỐNG HOẠT ĐỘNG HOÀN HẢO!** 🚀

