# Hướng dẫn Build và Deploy Music App

## 📱 Tổng quan

Dự án Music App sử dụng **Expo** (React Native). Có 3 cách chính để triển khai:

### 1. **APK** - Cài đặt trực tiếp trên Android
### 2. **AAB** - Upload lên Google Play Store
### 3. **OTA Updates** - Cập nhật qua mạng mà không cần build lại

---

## 🚀 Chuẩn bị trước khi Build

### Kiểm tra Backend API
⚠️ **QUAN TRỌNG**: Đảm bảo backend API của bạn KHÔNG chạy trên localhost!

Kiểm tra file cấu hình API (thường ở `src/config` hoặc `src/services`):
```javascript
// ❌ SAI - Không hoạt động trên thiết bị thật
const API_URL = 'http://localhost:3000';

// ✅ ĐÚNG - Sử dụng IP máy chủ hoặc domain
const API_URL = 'http://192.168.1.100:3000'; // IP local network
const API_URL = 'https://api.yourapp.com';   // Domain production
```

### Tạo Assets (Icon & Splash Screen)
Đảm bảo có các file sau trong thư mục `assets/`:
- `icon.png` - 1024x1024px
- `adaptive-icon.png` - 1024x1024px (cho Android)
- `splash.png` - 2048x2048px (nền trong suốt)

---

## 🛠 Phương pháp 1: Build APK với EAS (Khuyến nghị)

### Bước 1: Cài đặt EAS CLI (đã cài)
```bash
npm install -g eas-cli
```

### Bước 2: Đăng nhập Expo
```bash
eas login
```
- Email: your-email@example.com
- Password: ***

Chưa có tài khoản? Tạo tại: https://expo.dev/signup

### Bước 3: Cấu hình dự án
```bash
cd e:\appad\mobile
eas build:configure
```

Chọn:
- Platform: `All` hoặc `Android`
- Expo sẽ tự động tạo `eas.json` (đã có sẵn)

### Bước 4: Build APK
```bash
# Build APK để test (preview)
eas build -p android --profile preview

# Hoặc build production (AAB cho Play Store)
eas build -p android --profile production
```

**Thời gian build**: 10-20 phút (chạy trên server của Expo)

### Bước 5: Tải APK
Sau khi build xong:
1. EAS cung cấp link download APK
2. Hoặc vào: https://expo.dev
3. Chọn project → Builds → Download

### Bước 6: Cài đặt trên điện thoại
1. Chuyển file APK vào điện thoại
2. Bật "Cài đặt từ nguồn không xác định"
3. Mở file APK và cài đặt

---

## 🏗 Phương pháp 2: Build Local với Android Studio

### Yêu cầu:
- Android Studio
- Android SDK
- JDK 17 hoặc cao hơn

### Bước 1: Prebuild
```bash
cd e:\appad\mobile
npx expo prebuild
```

Lệnh này tạo thư mục `android/` với native code.

### Bước 2: Build APK
```bash
cd android
.\gradlew assembleRelease
```

### Bước 3: Lấy APK
File APK tại: `android/app/build/outputs/apk/release/app-release.apk`

⚠️ **Chú ý**: APK chưa sign sẽ không cài được. Cần tạo keystore:

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

---

## 🧪 Phương pháp 3: Test nhanh với Expo Go

**Không cần build**, chỉ để test:

```bash
cd e:\appad\mobile
npx expo start
```

Sau đó:
1. Cài app **Expo Go** từ Play Store
2. Quét QR code hiển thị trên terminal
3. App sẽ chạy ngay trên điện thoại

⚠️ **Giới hạn**: Chỉ hoạt động với các tính năng có sẵn trong Expo Go. Không hỗ trợ custom native modules.

---

## 📦 Upload lên Google Play Store

### Bước 1: Build AAB (App Bundle)
```bash
eas build -p android --profile production
```

### Bước 2: Chuẩn bị Google Play Console
1. Tạo tài khoản Google Play Developer ($25 một lần)
2. Tạo app mới: https://play.google.com/console
3. Điền đầy đủ thông tin app

### Bước 3: Upload AAB
1. Vào **Release** → **Production**
2. Upload file `.aab`
3. Điền Release notes
4. Submit for review

### Bước 4: Đợi review (2-7 ngày)

---

## 🔄 Cập nhật Over-The-Air (OTA)

Với **EAS Update**, bạn có thể push update mà không cần build lại:

### Setup:
```bash
npm install -g eas-cli
eas update:configure
```

### Push update:
```bash
eas update --branch production --message "Fix bug X"
```

User sẽ nhận update tự động khi mở app!

⚠️ **Giới hạn**: Chỉ update được JS code, không update được native code.

---

## ⚙️ Cấu hình quan trọng trong `app.json`

```json
{
  "expo": {
    "version": "1.0.0",          // Tăng khi có update lớn
    "android": {
      "versionCode": 1,          // Tăng MỖI lần build (1, 2, 3...)
      "package": "com.musicapp.app"  // Unique package name
    }
  }
}
```

**Lưu ý**:
- `version`: Hiển thị cho user (1.0.0, 1.1.0, 2.0.0...)
- `versionCode`: Số nguyên tăng dần (1, 2, 3, 4...) - PHẢI tăng mỗi lần build để update

---

## 🔍 Troubleshooting

### Lỗi "Unable to connect to server"
➡️ Kiểm tra IP backend, không dùng localhost!

### APK không cài được
➡️ Kiểm tra APK đã được sign chưa. Dùng EAS build để tự động sign.

### App crash khi mở
➡️ Kiểm tra logs:
```bash
adb logcat | grep ReactNativeJS
```

### Build timeout trên EAS
➡️ Kiểm tra dependencies, loại bỏ package không cần thiết.

---

## 📊 Các loại build

| Loại | Dùng để | Build với | Format |
|------|---------|-----------|--------|
| Development | Debug, test tính năng mới | `eas build --profile development` | APK |
| Preview | Test trước khi release | `eas build --profile preview` | APK |
| Production | Phát hành chính thức | `eas build --profile production` | AAB |

---

## 🎯 Checklist trước khi build

- [ ] Backend API không dùng localhost
- [ ] Có đầy đủ icon và splash screen
- [ ] Tăng `versionCode` trong `app.json`
- [ ] Test app trên Expo Go
- [ ] Kiểm tra tất cả tính năng hoạt động
- [ ] Đăng nhập EAS CLI
- [ ] Có tài khoản Expo

---

## 📚 Tài liệu tham khảo

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Submit to Google Play](https://docs.expo.dev/submit/android/)
- [EAS Update](https://docs.expo.dev/eas-update/introduction/)
- [Expo App Signing](https://docs.expo.dev/app-signing/app-credentials/)

---

**Lưu ý cuối**:
- Build lần đầu mất thời gian setup
- EAS tự động quản lý keystore (signing credentials)
- Nên test kỹ trên preview build trước khi production
- Backup keystore nếu build local!
