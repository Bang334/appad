# 🎊 HỆ THỐNG PREMIUM & REVENUE SHARING - HOÀN THÀNH

## 📖 Mục lục
1. [Tổng quan](#tổng-quan)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Luồng hoạt động](#luồng-hoạt-động)
5. [Mô hình chia doanh thu](#mô-hình-chia-doanh-thu)
6. [Hướng dẫn sử dụng](#hướng-dẫn-sử-dụng)
7. [Testing](#testing)

---

## 🎯 Tổng quan

Hệ thống music streaming với đầy đủ tính năng:
- ✅ **Premium Songs** - Bài hát cao cấp có badge vàng
- ✅ **Mua bài lẻ** - Mua 1 lần, nghe mãi mãi
- ✅ **Premium Subscription** - 99,000đ/30 ngày, nghe tất cả
- ✅ **Ví điện tử** - Nạp tiền qua QR VietComBank
- ✅ **Revenue Sharing** - Tự động chia 70% Artist / 30% Platform
- ✅ **Artist Dashboard** - Quản lý thu nhập & rút tiền
- ✅ **Admin Panel** - Duyệt rút tiền & tính revenue

---

## 💾 Database Schema

### Bảng chính (9 tables):

#### 1. **users** (Updated)
```sql
- balance DECIMAL(10,2)          -- Số dư ví
- is_premium TINYINT(1)          -- Premium status
- premium_expiry DATETIME        -- Ngày hết hạn premium
```

#### 2. **songs** (Updated)
```sql
- is_premium TINYINT(1)          -- Premium song?
- price DECIMAL(10,2)            -- Giá mua bài
```

#### 3. **artists** (Updated)
```sql
- balance DECIMAL(10,2)          -- Số dư artist
- total_earned DECIMAL(10,2)     -- Tổng kiếm được
- total_withdrawn DECIMAL(10,2)  -- Tổng đã rút
- bank_name VARCHAR(100)         -- Ngân hàng
- bank_account VARCHAR(50)       -- Số TK
- bank_account_name VARCHAR(100) -- Tên chủ TK
```

#### 4. **purchased_songs** (New)
```sql
- purchase_id, user_id, song_id
- purchase_date, price_paid
```

#### 5. **transactions** (New)
```sql
- type: 'deposit', 'purchase', 'subscription'
- status: 'pending', 'completed', 'cancelled'
- reference_code -- Mã nạp tiền
```

#### 6. **revenue_sharing** ⭐ (New)
```sql
- share_type: 'direct_purchase', 'premium_stream'
- total_amount, artist_share (70%), platform_share (30%)
- calculation_period -- Tháng tính toán
- is_paid_to_artist -- Đã trả chưa
```

#### 7. **premium_listening_stats** (New)
```sql
- user_id, song_id, artist_id, listen_date
- listen_count, total_duration, completed_count
-- Dùng để tính revenue premium
```

#### 8. **artist_withdrawals** (New)
```sql
- artist_id, amount, fee, actual_amount
- bank info, status, admin_note
```

#### 9. **platform_revenue** (New)
```sql
- revenue_type, amount (30%), period
-- Track doanh thu platform
```

---

## 📡 API Endpoints

### 🎵 Premium & Purchase APIs
```
POST /api/premium/subscribe              # Đăng ký Premium 99k/30 ngày
GET  /api/premium/status                 # Check status & expiry
POST /api/premium/cancel                 # Hủy Premium
POST /api/premium/purchase               # Mua bài hát (body: song_id)
GET  /api/premium/purchased-songs        # Danh sách đã mua
GET  /api/premium/purchase-history       # Lịch sử mua
GET  /api/premium/songs                  # Tất cả premium songs
GET  /api/premium/song/:id/access        # Check quyền truy cập
```

### 💰 Wallet APIs
```
GET  /api/wallet/balance                 # Xem số dư
POST /api/wallet/topup                   # Tạo QR nạp tiền
POST /api/wallet/confirm                 # Xác nhận đã chuyển
GET  /api/wallet/transactions            # Lịch sử giao dịch
GET  /api/wallet/transactions/pending    # Giao dịch đang chờ
GET  /api/wallet/statistics              # Thống kê ví
```

### 🎤 Artist APIs
```
GET  /api/artists/:id                    # Thông tin artist
GET  /api/artists/:id/dashboard          # Dashboard (wallet + stats)
GET  /api/artists/:id/balance            # Số dư
GET  /api/artists/:id/revenue            # Lịch sử doanh thu
POST /api/artists/:id/withdraw           # Rút tiền (min 50k)
GET  /api/artists/:id/withdrawals        # Lịch sử rút
PUT  /api/artists/:id/bank-info          # Update bank info
```

### 👨‍💼 Admin APIs
```
# Withdrawal Management
GET  /api/admin/withdrawals              # Tất cả yêu cầu
GET  /api/admin/withdrawals/pending-count
POST /api/admin/withdrawals/:id/approve  # Duyệt
POST /api/admin/withdrawals/:id/reject   # Từ chối

# Revenue Calculation
POST /api/revenue/calculate-monthly      # Tính revenue tháng
POST /api/revenue/apply-monthly          # Apply vào DB
POST /api/revenue/pay-artists            # Trả cho artists
GET  /api/revenue/platform-stats         # Stats platform
```

---

## 🔄 Luồng hoạt động

### 1️⃣ User nạp tiền
```
HomeScreen → Profile → Ví của tôi
→ Click "Nạp tiền"
→ Nhập số tiền (VD: 100,000đ)
→ Hiện QR VietComBank
→ User scan QR & chuyển khoản
→ Ghi đúng nội dung (reference code)
→ Tiền vào ví tự động (hoặc admin confirm)
```

### 2️⃣ User mua bài hát Premium
```
HomeScreen → Click play premium song
→ Modal "Mua bài hát" hiện ra
→ Hiển thị giá + số dư ví
→ Nếu đủ tiền → Click "Mua ngay"
→ System tự động:
   • Trừ tiền user
   • 70% vào ví artist (ngay lập tức)
   • 30% về platform
   • User có thể nghe không giới hạn
```

### 3️⃣ User đăng ký Premium
```
Profile → Premium
→ Click "Đăng ký ngay"
→ Trả 99,000đ từ balance
→ Premium active 30 ngày
→ Nghe tất cả premium songs
→ Mỗi lượt nghe được ghi nhận để tính revenue
```

### 4️⃣ Artist xem doanh thu & rút tiền
```
ArtistDetailScreen → Dashboard
→ Xem số dư ví
→ Xem doanh thu chi tiết (mua trực tiếp vs premium)
→ Click "Rút tiền"
→ Nhập số tiền (min 50k)
→ Submit yêu cầu
→ Đợi admin duyệt (1-3 ngày)
→ Nhận tiền vào bank
```

### 5️⃣ Admin duyệt rút tiền
```
Admin Dashboard → Quản lý rút tiền
→ Xem danh sách pending
→ Click "Duyệt" hoặc "Từ chối"
→ Nhập lý do (nếu từ chối)
→ Confirm
→ Nếu duyệt: Trừ ví artist, chuyển bank thủ công
```

### 6️⃣ Admin tính revenue premium (Cuối tháng)
```
1. Calculate: POST /api/revenue/calculate-monthly
   { year: 2025, month: 1 }
   → Response: Chi tiết từng artist nhận bao nhiêu

2. Apply: POST /api/revenue/apply-monthly
   → Tạo revenue_sharing records

3. Pay: POST /api/revenue/pay-artists
   → Cộng tiền vào artist balance
```

---

## 💰 Mô hình chia doanh thu

### **Direct Purchase** (Mua trực tiếp)
| Thành phần | % | Ví dụ (10,000đ) | Khi nào nhận |
|------------|---|-----------------|--------------|
| Artist | 70% | 7,000đ | Ngay lập tức |
| Platform | 30% | 3,000đ | Ngay lập tức |

### **Premium Subscription** (Đăng ký)
```
10 users × 99,000đ = 990,000đ/tháng

Artist Pool: 990,000 × 70% = 693,000đ
Platform: 990,000 × 30% = 297,000đ

Chia artist pool theo streams:
- Artist A: 500 streams / 2000 total (25%) → 173,250đ
- Artist B: 1500 streams / 2000 total (75%) → 519,750đ
```

**Đặc điểm:**
- Tính cuối tháng
- Chia theo tỷ lệ số lượt nghe
- Admin approve mới vào ví artist

---

## 📱 Mobile Screens

### User Screens:
1. **HomeScreen** - Premium badge trên songs
2. **PremiumScreen** - Subscribe & manage
3. **PurchasedSongsScreen** - Bài đã mua
4. **WalletScreen** - Ví & nạp tiền
5. **TopUpScreen** - QR VietComBank
6. **SongPurchaseModal** - Modal mua bài

### Artist Screens:
7. **ArtistDashboardScreen** - Tổng quan
8. **ArtistRevenueScreen** - Chi tiết doanh thu
9. **ArtistWithdrawScreen** - Rút tiền
10. **ArtistWithdrawalsScreen** - Lịch sử rút
11. **ArtistBankInfoScreen** - Bank info

### Admin Screens:
12. **AdminWithdrawalsScreen** - Duyệt rút tiền

---

## 🧪 Testing

### Test nạp tiền:
```javascript
// 1. Tạo yêu cầu nạp 100k
POST /api/wallet/topup
{ amount: 100000 }

// Response: QR code URL + reference code
{
  qr_url: "https://img.vietqr.io/image/VCB-1029727303-compact2.png?amount=100000&addInfo=MUSIC1...",
  reference_code: "MUSIC1703848293847",
  bank_info: { ... }
}

// 2. User scan QR & chuyển khoản
// 3. Admin confirm
POST /api/wallet/confirm
{ reference_code: "MUSIC1703848293847" }
```

### Test mua bài:
```javascript
// Mua bài ID = 1
POST /api/premium/purchase
{ song_id: 1 }

// Check database:
SELECT * FROM revenue_sharing WHERE share_type = 'direct_purchase';
SELECT balance FROM artists WHERE artist_id = 1; // Tăng 70%
```

### Test premium:
```javascript
// Subscribe
POST /api/premium/subscribe
{ duration_days: 30 }

// Play premium song
POST /api/songs/1/play
{ duration_listened: 180, is_completed: true }

// Check stats
SELECT * FROM premium_listening_stats WHERE user_id = 1;
```

---

## 💳 Thông tin thanh toán

### VietComBank QR Code:
- **Ngân hàng:** VietComBank (VCB)
- **Số TK:** 1029727303
- **Chủ TK:** NGUYEN SY KIM BANG
- **Nội dung:** Reference code tự động (VD: MUSIC1703...)
- **QR URL:** Auto-generate qua https://img.vietqr.io

### Giá cả:
- **Premium 30 ngày:** 99,000đ
- **Bài hát:** Tùy admin setting (VD: 5,000-50,000đ)
- **Rút tiền:** Min 50,000đ, fee 0đ

---

## 🛠️ Setup & Run

### 1. Backend:
```bash
cd backend

# Chạy migrations (nếu chưa)
mysql -u root -p music_app_db < src/migrations/ALL_REVENUE_MIGRATIONS.sql

# Start server
npm start
```

### 2. Mobile:
```bash
cd mobile

# Update API URL trong config/api.js
export const API_BASE_URL = 'http://YOUR_IP:5000/api';

# Start
npm start
```

---

## 📊 Files đã tạo

### Backend (30+ files):
```
models/
  - user.model.js (updated)
  - song.model.js (updated)
  - artist.model.js (updated)
  - purchased-song.model.js
  - transaction.model.js
  - revenue-sharing.model.js ⭐
  - premium-listening-stats.model.js
  - artist-withdrawal.model.js

controllers/
  - premium.controller.js (updated)
  - song.controller.js (updated)
  - wallet.controller.js
  - artist.controller.js ⭐
  - revenue.controller.js ⭐
  - admin-artist.controller.js

routes/
  - premium.routes.js
  - wallet.routes.js
  - artist.routes.js ⭐
  - revenue.routes.js ⭐
  - admin.routes.js (updated)

migrations/
  - 001-003: Premium & purchased songs
  - 004-009: Revenue system ⭐
  - ALL_REVENUE_MIGRATIONS.sql (Chạy tất cả)
```

### Mobile (15+ files):
```
services/
  - premiumService.js
  - walletService.js
  - artistService.js ⭐

screens/
  Premium/
    - PremiumScreen.js (updated)
    - PurchasedSongsScreen.js
    - PurchaseHistoryScreen.js
  
  Wallet/
    - WalletScreen.js
    - TopUpScreen.js
    - TransactionHistoryScreen.js
  
  Artist/ ⭐
    - ArtistDashboardScreen.js
    - ArtistRevenueScreen.js
    - ArtistWithdrawScreen.js
    - ArtistWithdrawalsScreen.js
    - ArtistBankInfoScreen.js
  
  Admin/
    - AdminWithdrawalsScreen.js

components/
  - PremiumBadge.js
  - SongPurchaseModal.js (updated)
```

---

## 🎨 UI Highlights

### Premium Badge:
- Badge vàng sáng với icon ⭐
- Hiển thị trên mọi premium songs
- Responsive design

### Purchase Modal:
- Hiển thị giá bài hát
- Show số dư ví real-time
- Gợi ý nạp tiền nếu thiếu
- Link trực tiếp đến Wallet

### QR Code Screen:
- QR code to đẹp
- Copy nhanh STK & nội dung
- Hướng dẫn rõ ràng
- Warning box nổi bật

### Artist Dashboard:
- Wallet card gradient đẹp
- Stats với icons màu sắc
- Revenue chart by type
- Quick actions

---

## 🔐 Security

- ✅ JWT authentication cho tất cả APIs
- ✅ Role-based access control (user/artist/admin)
- ✅ Balance check trước khi transaction
- ✅ Rollback nếu transaction fail
- ✅ Unique constraints để tránh duplicate
- ✅ Foreign keys để đảm bảo data integrity

---

## 📈 Revenue Formula

### Direct Purchase:
```javascript
artistShare = price × 0.70
platformShare = price × 0.30

// Trả ngay vào artist balance
```

### Premium Stream:
```javascript
// Cuối tháng:
totalPremiumRevenue = SUM(subscriptions trong tháng)
artistPool = totalPremiumRevenue × 0.70

// Cho mỗi artist:
artistStreams = COUNT(premium_listening_stats WHERE artist_id = X)
totalStreams = COUNT(tất cả premium listens)

artistRevenue = artistPool × (artistStreams / totalStreams)
```

---

## 🎊 STATUS: READY FOR PRODUCTION!

**Backend:** ✅ 100%  
**Mobile:** ✅ 100%  
**Database:** ✅ 100%  
**Testing:** ✅ Ready  
**Documentation:** ✅ Complete  

**Server đang chạy:** http://localhost:5000

---

## 📞 Support

Files hướng dẫn chi tiết:
- `backend/FINAL_SUMMARY.md` - Tổng hợp backend
- `backend/DATABASE_REVENUE_SCHEMA.md` - Database chi tiết
- `backend/RUN_MIGRATIONS.md` - Hướng dẫn migrations
- `backend/REVENUE_SYSTEM_IMPLEMENTATION.md` - Revenue system

---

**🚀 HỆ THỐNG ĐÃ HOÀN THIỆN!**

Bạn có thể bắt đầu test ngay! 🎉

