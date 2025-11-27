# ✅ ĐÃ SỬA LỖI NETWORK ERROR

## 🔍 Vấn đề:
- IP trong `api.js` là `192.168.31.105` (SAI)
- IP thực tế của máy là `192.168.3.50` (ĐÚNG)

## ✅ Đã sửa:
1. ✅ Cập nhật IP trong `mobile/src/config/api.js` → `192.168.3.50`
2. ✅ Tăng timeout lên 30s
3. ✅ Thêm console.log để debug

## 🧪 Test lại:

### Bước 1: Kiểm tra Backend Server
```bash
cd backend
npm start
# Expect: "🚀 Server is running on port 5000"
```

### Bước 2: Test API bằng Browser
Mở browser và vào:
```
http://192.168.3.50:5000/api/health
```
✅ Expect: `{"status":"OK","message":"Music App API is running"}`

### Bước 3: Restart Mobile App
1. Stop Expo app
2. Clear cache: `npm start -- --clear`
3. Restart app

### Bước 4: Test Đăng ký
1. Mở Register screen
2. Nhập thông tin
3. Click "Đăng ký"
4. ✅ Expect: Thành công!

## 📝 Lưu ý:

### Nếu IP thay đổi:
Khi IP máy thay đổi (khi đổi WiFi), cần:
1. Chạy `ipconfig` để lấy IP mới
2. Cập nhật IP trong `mobile/src/config/api.js`
3. Restart app

### Cho Android Emulator:
Nếu dùng Android Emulator, đổi thành:
```javascript
export const API_BASE_URL = 'http://10.0.2.2:5000/api';
```

### Cho iOS Simulator:
Nếu dùng iOS Simulator, đổi thành:
```javascript
export const API_BASE_URL = 'http://localhost:5000/api';
```

---

**Đã sửa xong! Hãy test lại form đăng ký!** 🚀

