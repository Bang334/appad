# 📊 Logic Tính Tiền Premium Dựa Trên Lượt Nghe - Ví Dụ Chi Tiết

## 🔄 Flow Tổng Quan

### 1. **User Đăng Ký Premium**
- User trả 99,000đ/tháng
- 70% (69,300đ) → Artist Pool
- 30% (29,700đ) → Platform

### 2. **User Nghe Nhạc Premium**
- Mỗi lần play, hệ thống ghi lại vào `premium_listening_stats`
- Track: `user_id`, `song_id`, `artist_id`, `listen_count`, `duration`

### 3. **Tính Toán Hàng Tháng (Admin)**
- Admin chạy tính toán vào cuối tháng
- Tính % lượt nghe của mỗi artist
- Chia Artist Pool theo % lượt nghe

### 4. **Trả Tiền Cho Artist**
- Admin duyệt và trả tiền vào ví artist

---

## 📝 Ví Dụ Cụ Thể

### **Tháng 1/2025**

#### **Bước 1: User Đăng Ký Premium**
```
User A: 99,000đ
User B: 99,000đ
User C: 99,000đ
─────────────────
Tổng: 297,000đ

Artist Pool (70%): 207,900đ
Platform Pool (30%): 89,100đ
```

#### **Bước 2: Lượt Nghe Trong Tháng**

**Artist 1 (Sơn Tùng):**
- Song 1: 500 lượt
- Song 2: 300 lượt
- Song 3: 200 lượt
- **Tổng: 1,000 lượt**

**Artist 2 (Đen Vâu):**
- Song 4: 800 lượt
- Song 5: 200 lượt
- **Tổng: 1,000 lượt**

**Artist 3 (HIEUTHUHAI):**
- Song 6: 500 lượt
- **Tổng: 500 lượt**

**Tổng tất cả: 2,500 lượt**

#### **Bước 3: Tính Toán Revenue**

**Công thức:**
```
Artist Revenue = (Artist Pool × Artist Streams) / Total Streams
```

**Kết quả:**

**Artist 1 (Sơn Tùng):**
- Streams: 1,000
- Percentage: (1,000 / 2,500) × 100 = 40%
- Revenue: (207,900 × 1,000) / 2,500 = **83,160đ**

**Artist 2 (Đen Vâu):**
- Streams: 1,000
- Percentage: (1,000 / 2,500) × 100 = 40%
- Revenue: (207,900 × 1,000) / 2,500 = **83,160đ**

**Artist 3 (HIEUTHUHAI):**
- Streams: 500
- Percentage: (500 / 2,500) × 100 = 20%
- Revenue: (207,900 × 500) / 2,500 = **41,580đ**

**Tổng kiểm tra:** 83,160 + 83,160 + 41,580 = **207,900đ** ✅

---

## 💻 Code Flow

### **1. Tracking Premium Listening**

**File:** `backend/src/controllers/song.controller.js`

```javascript
// Khi user play song
static async play(req, res) {
  const { id } = req.params;
  const userId = req.user?.user_id;
  
  // Check if user is premium
  const isPremium = await UserModel.isPremiumActive(userId);
  const song = await SongModel.findById(id);
  
  if (isPremium && song.is_premium) {
    // Track premium listening
    await PremiumListeningStatsModel.recordListen({
      user_id: userId,
      song_id: id,
      artist_id: song.artist_id,
      duration_listened: song.duration || 0,
      is_completed: true
    });
  }
  
  // ... rest of play logic
}
```

### **2. Tính Toán Hàng Tháng**

**File:** `backend/src/controllers/revenue.controller.js`

```javascript
// Admin chạy: POST /api/revenue/calculate
{
  "year": 2025,
  "month": 1
}

// Response:
{
  "success": true,
  "data": {
    "period": "2025-01",
    "total_revenue": 297000,
    "artist_pool": 207900,
    "platform_pool": 89100,
    "total_streams": 2500,
    "artist_shares": [
      {
        "artist_id": 1,
        "streams": 1000,
        "percentage": "40.00",
        "revenue": "83160.00"
      },
      {
        "artist_id": 2,
        "streams": 1000,
        "percentage": "40.00",
        "revenue": "83160.00"
      },
      {
        "artist_id": 3,
        "streams": 500,
        "percentage": "20.00",
        "revenue": "41580.00"
      }
    ]
  }
}
```

### **3. Apply Revenue (Tạo Records)**

**File:** `backend/src/controllers/revenue.controller.js`

```javascript
// Admin chạy: POST /api/revenue/apply
{
  "year": 2025,
  "month": 1,
  "artist_shares": [
    {
      "artist_id": 1,
      "streams": 1000,
      "revenue": "83160.00"
    },
    {
      "artist_id": 2,
      "streams": 1000,
      "revenue": "83160.00"
    },
    {
      "artist_id": 3,
      "streams": 500,
      "revenue": "41580.00"
    }
  ]
}

// Tạo records trong revenue_sharing table:
// - share_type: 'premium_stream'
// - calculation_period: '2025-01'
// - is_paid_to_artist: 0 (chờ admin duyệt)
```

### **4. Trả Tiền Cho Artist**

**File:** `backend/src/controllers/revenue.controller.js`

```javascript
// Admin chạy: POST /api/revenue/pay
{
  "artist_id": 1,
  "sharing_ids": [1, 2, 3] // IDs từ revenue_sharing
}

// Hệ thống sẽ:
// 1. Cộng 83,160đ vào artist.balance
// 2. Cập nhật is_paid_to_artist = 1
// 3. Ghi nhận paid_at = NOW()
```

---

## ✅ Kiểm Tra Logic

### **Các Điểm Cần Kiểm Tra:**

1. ✅ **Tracking Premium Listening**
   - Method `play()` có check `isPremium` và `song.is_premium`?
   - Có gọi `PremiumListeningStatsModel.recordListen()`?

2. ✅ **Tính Toán Revenue**
   - Có lấy đúng tổng subscription revenue trong tháng?
   - Có tính đúng Artist Pool (70%)?
   - Có lấy đúng tổng streams từ `premium_listening_stats`?
   - Có chia đúng theo % streams?

3. ✅ **Apply Revenue**
   - Có tạo records trong `revenue_sharing`?
   - Có set đúng `calculation_period`?
   - Có set `is_paid_to_artist = 0` (chờ duyệt)?

4. ✅ **Pay Artists**
   - Có cộng vào `artist.balance`?
   - Có update `is_paid_to_artist = 1`?

---

## 🧪 Test Case

### **Scenario:**
- 3 users đăng ký premium (297,000đ)
- Artist 1: 1,000 streams
- Artist 2: 1,000 streams  
- Artist 3: 500 streams
- Total: 2,500 streams

### **Expected Result:**
- Artist Pool: 207,900đ
- Artist 1: 83,160đ (40%)
- Artist 2: 83,160đ (40%)
- Artist 3: 41,580đ (20%)
- Platform: 89,100đ (30%)

### **Verification:**
```sql
-- Check premium subscriptions
SELECT SUM(amount) FROM transactions 
WHERE type = 'subscription' AND status = 'completed'
AND DATE_FORMAT(created_at, '%Y-%m') = '2025-01';

-- Check streams
SELECT artist_id, SUM(listen_count) as streams
FROM premium_listening_stats
WHERE listen_date BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY artist_id;

-- Check revenue sharing
SELECT * FROM revenue_sharing
WHERE calculation_period = '2025-01'
AND share_type = 'premium_stream';
```

---

## ⚠️ Lưu Ý

1. **Premium Listening chỉ track khi:**
   - User có `is_premium = 1` và `premium_expiry > NOW()`
   - Song có `is_premium = 1`

2. **Revenue chỉ tính cho:**
   - Subscriptions trong tháng đó
   - Streams trong tháng đó

3. **Artist chỉ nhận tiền khi:**
   - Admin chạy `applyMonthlyRevenue` (tạo records)
   - Admin chạy `payArtists` (cộng vào balance)

