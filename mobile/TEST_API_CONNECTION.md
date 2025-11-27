# 🔍 HƯỚNG DẪN DEBUG NETWORK ERROR

## Vấn đề: "Network Error" khi đăng ký

### Bước 1: Kiểm tra Backend Server
```bash
cd backend
npm start
# Check console xem server có chạy không
# Expect: "🚀 Server is running on port 5000"
```

### Bước 2: Kiểm tra IP Address

**Windows:**
```bash
ipconfig
# Tìm IPv4 Address (VD: 192.168.1.100)
```

**Mac/Linux:**
```bash
ifconfig
# Tìm inet address
```

### Bước 3: Cập nhật API URL

Mở `mobile/src/config/api.js`:

**Cho EXPO GO (điện thoại thật):**
```javascript
export const API_BASE_URL = 'http://YOUR_IP:5000/api';
// VD: export const API_BASE_URL = 'http://192.168.1.100:5000/api';
```

**Cho ANDROID EMULATOR:**
```javascript
export const API_BASE_URL = 'http://10.0.2.2:5000/api';
```

**Cho iOS SIMULATOR:**
```javascript
export const API_BASE_URL = 'http://localhost:5000/api';
```

### Bước 4: Test API bằng Browser/Postman

Mở browser và test:
```
http://YOUR_IP:5000/api/health
```

Expect: `{"status":"OK","message":"Music App API is running"}`

### Bước 5: Test Register API

**Postman/curl:**
```bash
POST http://YOUR_IP:5000/api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "123456",
  "full_name": "Test User"
}
```

### Bước 6: Kiểm tra Firewall

**Windows:**
- Control Panel → Windows Defender Firewall
- Allow Node.js through firewall

**Mac:**
- System Preferences → Security & Privacy → Firewall
- Allow Node.js

### Bước 7: Kiểm tra CORS

Backend đã có CORS config:
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
```

Nếu vẫn lỗi, thử thêm vào `.env`:
```
CORS_ORIGIN=*
```

### Bước 8: Restart App

Sau khi sửa API URL:
1. Stop Expo app
2. Clear cache: `npm start -- --clear`
3. Restart app

---

## ✅ Checklist

- [ ] Backend server đang chạy (port 5000)
- [ ] IP address đúng trong api.js
- [ ] Mobile và backend cùng WiFi network
- [ ] Firewall không block port 5000
- [ ] Test API bằng browser/Postman thành công
- [ ] Restart app sau khi sửa config

---

## 🐛 Common Issues

### Issue 1: "Network Error" hoặc "ECONNREFUSED"
**Solution:** 
- Check IP address đúng chưa
- Check server đang chạy
- Check cùng network

### Issue 2: "Timeout"
**Solution:**
- Tăng timeout trong api.js: `timeout: 30000`
- Check network connection

### Issue 3: "CORS Error"
**Solution:**
- Backend đã có CORS config
- Check CORS_ORIGIN trong .env

---

**Sau khi fix, test lại form đăng ký!** 🚀

