# 🎉 HỆ THỐNG PREMIUM & REVENUE SHARING - HOÀN THÀNH 100%

## 📋 TỔNG QUAN HỆ THỐNG

Bạn đã có một hệ thống music streaming app hoàn chỉnh với:
- ✅ Premium subscription (99,000đ/30 ngày)
- ✅ Mua bài hát lẻ (giá tùy chỉnh)
- ✅ Ví điện tử với nạp tiền QR VietComBank
- ✅ Tự động chia doanh thu Artist 70% / Platform 30%
- ✅ Artist dashboard với quản lý thu nhập
- ✅ Admin panel quản lý rút tiền

---

## 🎯 CÁC TÍNH NĂNG CHÍNH

### **1. Premium Songs**
- Bài hát có `is_premium = 1` chỉ premium users hoặc người đã mua mới nghe được
- Hiển thị badge "PREMIUM" đẹp mắt trên UI
- Khi click play sẽ check access và hiện modal mua nếu chưa có quyền

### **2. Mua bài hát (Direct Purchase)**
- User mua bài → Trả bằng balance trong ví
- **70% tiền vào ví artist ngay lập tức**
- **30% về platform**
- Sau khi mua → Nghe không giới hạn, không cần premium

### **3. Premium Subscription**
- Giá: **99,000đ/30 ngày**
- Nghe tất cả premium songs không giới hạn
- Hệ thống track số lượt nghe
- Cuối tháng: Chia 70% premium revenue theo tỷ lệ streams

### **4. Ví điện tử**
- Nạp tiền qua QR VietComBank
- Bank: VCB - 1029727303 - NGUYEN SY KIM BANG
- Reference code tự động để xác nhận
- Xem lịch sử giao dịch

### **5. Artist Dashboard**
- Xem số dư ví
- Xem doanh thu chi tiết (direct purchase vs premium stream)
- Rút tiền về bank (min 50k)
- Cập nhật thông tin ngân hàng
- Xem lịch sử rút tiền

### **6. Admin Management**
- Duyệt/từ chối yêu cầu rút tiền
- Tính revenue premium cuối tháng
- Xem thống kê platform revenue
- Quản lý withdrawals

---

## 💰 MÔ HÌNH CHIA DOANH THU

### **Mua bài hát trực tiếp:**
```
User mua 10,000đ
├─ Artist: 7,000đ (70%) → Vào ví ngay
└─ Platform: 3,000đ (30%)
```

### **Premium Subscription:**
```
Tháng 1: 10 users × 99,000đ = 990,000đ
├─ Artist Pool: 693,000đ (70%)
│  ├─ Artist A: 500 streams (25%) → 173,250đ
│  └─ Artist B: 1500 streams (75%) → 519,750đ
└─ Platform: 297,000đ (30%)
```

**Công thức:**
```javascript
artistRevenue = (artistStreams / totalStreams) × artistPool
```

---

## 🗂️ DATABASE TABLES

### Tables đã tạo (9 tables):
1. **users** - Thêm balance, is_premium, premium_expiry
2. **songs** - Thêm is_premium, price
3. **artists** - Thêm balance, total_earned, bank info
4. **purchased_songs** - Bài đã mua
5. **transactions** - Lịch sử giao dịch users
6. **revenue_sharing** - ⭐ Chia doanh thu 70/30
7. **premium_listening_stats** - Stats nghe premium
8. **artist_withdrawals** - Yêu cầu rút tiền
9. **platform_revenue** - Doanh thu platform

---

## 📡 API ENDPOINTS

### **User - Premium & Purchase**
```
POST /api/premium/subscribe            - Đăng ký Premium (99k)
GET  /api/premium/status               - Check premium
POST /api/premium/purchase             - Mua bài hát
GET  /api/premium/purchased-songs      - Bài đã mua
GET  /api/premium/song/:id/access      - Check quyền truy cập
```

### **User - Wallet**
```
GET  /api/wallet/balance               - Xem số dư
POST /api/wallet/topup                 - Nạp tiền (QR code)
POST /api/wallet/confirm               - Confirm đã chuyển
GET  /api/wallet/transactions          - Lịch sử
GET  /api/wallet/statistics            - Thống kê
```

### **Artist - Dashboard & Revenue**
```
GET  /api/artists/:id                  - Thông tin artist
GET  /api/artists/:id/dashboard        - Dashboard
GET  /api/artists/:id/balance          - Số dư ví
GET  /api/artists/:id/revenue          - Lịch sử doanh thu
POST /api/artists/:id/withdraw         - Rút tiền
GET  /api/artists/:id/withdrawals      - Lịch sử rút
PUT  /api/artists/:id/bank-info        - Update bank
```

### **Admin - Withdrawal Management**
```
GET  /api/admin/withdrawals            - Tất cả yêu cầu
GET  /api/admin/withdrawals/pending-count
POST /api/admin/withdrawals/:id/approve - Duyệt
POST /api/admin/withdrawals/:id/reject  - Từ chối
```

### **Admin - Revenue Calculation**
```
POST /api/revenue/calculate-monthly    - Tính revenue tháng
POST /api/revenue/apply-monthly        - Apply vào DB
POST /api/revenue/pay-artists          - Trả tiền artists
GET  /api/revenue/platform-stats       - Stats platform
```

---

## 📱 MOBILE SCREENS

### **User Screens (12)**
1. HomeScreen - Hiển thị premium badge
2. PremiumScreen - Subscribe premium
3. PurchasedSongsScreen - Bài đã mua
4. PurchaseHistoryScreen - Lịch sử
5. WalletScreen - Ví điện tử
6. TopUpScreen - Nạp tiền QR
7. TransactionHistoryScreen - Lịch sử giao dịch

### **Artist Screens (5)**
8. ArtistDashboardScreen - Dashboard artist
9. ArtistRevenueScreen - Chi tiết doanh thu
10. ArtistWithdrawScreen - Rút tiền
11. ArtistWithdrawalsScreen - Lịch sử rút
12. ArtistBankInfoScreen - Info bank

### **Admin Screens (1)**
13. AdminWithdrawalsScreen - Duyệt rút tiền

### **Components (2)**
- PremiumBadge - Badge vàng cho premium songs
- SongPurchaseModal - Modal mua bài với balance check

---

## 🔄 LUỒNG SỬ DỤNG

### **User muốn nghe Premium song:**
```
1. Click play premium song
2. Nếu chưa có premium/chưa mua:
   → Modal mua hiện lên
   → Hiển thị giá + số dư
   → Nếu thiếu tiền → Gợi ý nạp
3. Nạp tiền qua QR VietComBank
4. Mua bài HOẶC đăng ký Premium
5. Nghe nhạc không giới hạn
```

### **Artist muốn rút tiền:**
```
1. Vào ArtistDetailScreen
2. Click "Dashboard"
3. Xem số dư trong ví
4. Click "Rút tiền"
5. Cập nhật bank info (nếu chưa có)
6. Nhập số tiền (min 50k)
7. Submit yêu cầu
8. Đợi admin duyệt (1-3 ngày)
9. Nhận tiền vào bank
```

### **Admin duyệt rút tiền:**
```
1. Vào Admin Dashboard
2. Click "Quản lý rút tiền"
3. Xem danh sách pending
4. Click "Duyệt" hoặc "Từ chối"
5. Nhập ghi chú (nếu reject)
6. Confirm
7. Nếu approve: Tiền trừ khỏi artist balance
8. Chuyển tiền thủ công cho artist
9. Done!
```

### **Admin tính revenue premium (cuối tháng):**
```
1. API: POST /api/revenue/calculate-monthly
   Body: { year: 2025, month: 1 }
   → Trả về artist_shares (mỗi artist nhận bao nhiêu)

2. API: POST /api/revenue/apply-monthly
   Body: { year: 2025, month: 1, artist_shares: [...] }
   → Tạo revenue_sharing records

3. API: POST /api/revenue/pay-artists
   Body: { sharing_ids: [...], artist_id: X }
   → Cộng tiền vào artist balance
   → Mark is_paid = 1
```

---

## 🧪 TEST CASES

### Test nạp tiền:
```bash
curl -X POST http://localhost:5000/api/wallet/topup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100000}'

# Response: QR code URL + reference code
```

### Test mua bài:
```bash
curl -X POST http://localhost:5000/api/premium/purchase \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"song_id": 1}'

# Check: revenue_sharing có record mới, artist balance tăng
```

### Test subscribe:
```bash
curl -X POST http://localhost:5000/api/premium/subscribe \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"duration_days": 30}'

# Check: user is_premium = 1, balance giảm 99k
```

---

## ⚙️ CONFIGURATION

### **Backend .env:**
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=music_app_db
DB_PORT=3307
JWT_SECRET=your_secret_key
PORT=5000
```

### **Mobile API config:**
```javascript
// mobile/src/config/api.js
export const API_BASE_URL = 'http://YOUR_IP:5000/api';
```

---

## 🎊 HOÀN THÀNH!

**Backend:**
- ✅ 8 Models
- ✅ 6 Controllers
- ✅ 5 Route files
- ✅ Auto revenue sharing
- ✅ Premium tracking
- ✅ Wallet & QR code

**Database:**
- ✅ 9 tables với đầy đủ relationships
- ✅ Indexes để optimize performance
- ✅ Revenue tracking system

**Mobile:**
- ✅ 13 screens mới
- ✅ 3 services
- ✅ 2 components
- ✅ Navigation đầy đủ

**Documentation:**
- ✅ Database schema
- ✅ API documentation
- ✅ Revenue model explanation
- ✅ Testing guide

---

## 🚀 NEXT STEPS (Optional)

Nếu muốn mở rộng thêm:
1. **Auto revenue calculation:** Setup cron job chạy cuối tháng
2. **Push notifications:** Thông báo khi có tiền vào ví
3. **Analytics dashboard:** Charts doanh thu theo thời gian
4. **Payment gateway:** Tích hợp thanh toán tự động
5. **Artist verification:** Xác minh artist trước khi rút tiền

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề:
1. Check database đã chạy migrations chưa
2. Check .env đã config đúng chưa
3. Check API_BASE_URL trong mobile đúng chưa
4. Restart backend server
5. Clear cache mobile app

---

**HỆ THỐNG ĐÃ SẴN SÀNG SỬ DỤNG!** 🎊🚀

Chúc bạn thành công với app của mình! 💪

