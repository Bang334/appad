# ✅ HƯỚNG DẪN NHANH - BUILD APK

EAS CLI đã được cài đặt thành công! Bây giờ bạn có thể build APK.

## 🚀 Các bước tiếp theo

### Bước 1: Đăng nhập Expo
```bash
eas login
```

Nếu chưa có tài khoản:
1. Vào https://expo.dev/signup
2. Đăng ký tài khoản miễn phí
3. Sau đó chạy `eas login`

### Bước 2: Build APK (Preview)
```bash
cd e:\appad\mobile
eas build -p android --profile preview
```

Lệnh này sẽ:
- ✅ Tự động cấu hình project
- ✅ Tự động tạo và quản lý keystore (signing)
- ✅ Build APK trên cloud server của Expo
- ✅ Cung cấp link download khi xong

**Thời gian**: Khoảng 10-20 phút

### Bước 3: Tải APK
Sau khi build xong, bạn sẽ thấy:
```
✔ Build finished.
🔗 https://expo.dev/accounts/[user]/projects/music-app/builds/[id]
```

Nhấn vào link để tải APK về!

---

## ⚠️ LƯU Ý QUAN TRỌNG - Backend API

**Hiện tại bạn đang dùng**: `http://192.168.3.50:5000/api`

### Để APK hoạt động khi triển khai thực tế:

#### Option 1: Deploy backend lên server cloud (KHUYẾN NGHỊ)
- Heroku (miễn phí với giới hạn)
- Railway.app (miễn phí $5/tháng)
- Render.com (miễn phí)
- AWS/DigitalOcean (trả phí)

Sau đó update `src/config/api.js`:
```javascript
export const API_BASE_URL = 'https://your-backend.herokuapp.com/api';
```

#### Option 2: Sử dụng IP public + Port Forwarding
Nếu backend chạy trên máy nhà:
1. Cấu hình port forwarding trên router (port 5000)
2. Dùng IP public hoặc domain
3. **LƯU Ý**: Không an toàn, chỉ dùng để test!

#### Option 3: Chỉ dùng trong mạng LAN (Test)
APK chỉ hoạt động khi:
- Điện thoại và server cùng WiFi (192.168.3.x)
- Backend đang chạy

---

## 📦 Các loại build

### 1. Preview (Để test - APK)
```bash
eas build -p android --profile preview
```
✅ Dùng để test trên thiết bị thật
✅ Cài trực tiếp được
✅ Build nhanh

### 2. Production (Cho Play Store - AAB)
```bash
eas build -p android --profile production
```
⏳ Build chậm hơn (optimized)
📦 Format AAB (để upload Play Store)
🚀 Tối ưu cho production

---

## 🔄 Cập nhật app sau khi build

### Cách 1: Build lại APK (Toàn bộ)
Mỗi khi có thay đổi lớn:
1. Tăng `versionCode` trong `app.json`
2. Chạy lại `eas build`
3. Phát hành APK mới

### Cách 2: OTA Update (Chỉ code JS)
Setup:
```bash
eas update:configure
```

Push update:
```bash
eas update --branch production --message "Update mới"
```

User tự động nhận update khi mở app!

---

## 📊 Checklist trước khi build

- [ ] Backend đang chạy và accessible
- [ ] API_BASE_URL không phải localhost
- [ ] Test app với `npx expo start` trước
- [ ] Có icon.png (1024x1024)
- [ ] Có adaptive-icon.png (1024x1024)
- [ ] Có splash.png (2048x2048)
- [ ] Version trong app.json hợp lý

---

## 🆘 Gặp lỗi?

### "Network request failed"
➡️ Backend không accessible từ điện thoại
➡️ Kiểm tra firewall/antivirus

### "Build failed"
➡️ Kiểm tra logs
➡️ Có thể do dependencies conflict
➡️ Thử: `npm install` lại

### "Cannot sign APK"
➡️ EAS tự động quản lý signing
➡️ Nếu lỗi, xóa credentials và tạo lại:
```bash
eas credentials
```

---

## 📱 Cài APK lên điện thoại

1. **Tải APK về máy tính** từ link EAS cung cấp
2. **Chuyển vào điện thoại** (USB/Google Drive/Email)
3. **Bật "Unknown sources"**:
   - Settings → Security → Install unknown apps
   - Cho phép trình duyệt/file manager
4. **Mở file APK** và nhấn Install

---

## 🎯 Các lệnh hay dùng

```bash
# Xem danh sách builds
eas build:list

# Xem chi tiết build
eas build:view [build-id]

# Cancel build đang chạy
eas build:cancel

# Xem credentials
eas credentials

# Update OTA
eas update

# Submit lên Play Store
eas submit -p android
```

---

**Sẵn sàng build chưa?** Chạy lệnh:
```bash
eas login
eas build -p android --profile preview
```

Chúc bạn build thành công! 🚀
