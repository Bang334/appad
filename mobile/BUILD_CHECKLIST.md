# 🚀 Build & Deploy Checklist

Sử dụng checklist này trước khi build APK để đảm bảo mọi thứ hoạt động đúng.

---

## 📋 PRE-BUILD CHECKLIST

### 1. Cấu hình Backend ✅
- [ ] Backend API đang chạy
- [ ] Backend accessible từ mạng (không phải localhost)
- [ ] Đã cập nhật `src/config/environment.js` với URL đúng
- [ ] Test API connection (xem TEST_API_CONNECTION.md)

### 2. Assets & Branding ✅
- [ ] Icon app (1024x1024px) tại `assets/icon.png`
- [ ] Adaptive icon (1024x1024px) tại `assets/adaptive-icon.png`
- [ ] Splash screen (2048x2048px) tại `assets/splash.png`
- [ ] Tên app trong `app.json` → `expo.name`
- [ ] Package name duy nhất: `expo.android.package`

### 3. Versioning ✅
- [ ] `expo.version` đã được cập nhật (VD: "1.0.0" → "1.1.0")
- [ ] `expo.android.versionCode` đã tăng (VD: 1 → 2)
- [ ] **LƯU Ý**: versionCode PHẢI tăng mỗi lần build!

### 4. Testing ✅
- [ ] App chạy được với `npx expo start`
- [ ] Test trên Expo Go app (điện thoại)
- [ ] Tất cả features hoạt động bình thường
- [ ] Không có lỗi trong console
- [ ] Test login/logout
- [ ] Test API calls

### 5. Environment Configuration ✅
Kiểm tra `src/config/environment.js`:
- [ ] ENV đã chọn đúng ('development', 'staging', hoặc 'production')
- [ ] API_BASE_URL không phải localhost
- [ ] SOCKET_URL (nếu dùng) đã cấu hình đúng

### 6. Dependencies ✅
- [ ] Chạy `npm install` để đảm bảo packages đầy đủ
- [ ] Không có vulnerability nghiêm trọng (`npm audit`)
- [ ] Package.json không có conflict

### 7. Account & Tools ✅
- [ ] Đã cài đặt EAS CLI: `npm install -g eas-cli`
- [ ] Đã đăng nhập Expo: `eas login`
- [ ] Tài khoản Expo hoạt động bình thường

---

## 🔨 BUILD COMMANDS

### Build APK để Test (Preview)
```bash
cd e:\appad\mobile
eas build -p android --profile preview
```
**Thời gian**: 10-20 phút
**Output**: APK file
**Dùng cho**: Test trên thiết bị thật

### Build AAB cho Play Store (Production)
```bash
cd e:\appad\mobile
eas build -p android --profile production
```
**Thời gian**: 15-30 phút
**Output**: AAB file
**Dùng cho**: Upload lên Google Play Store

---

## 📱 POST-BUILD CHECKLIST

### 1. Download & Install ✅
- [ ] Tải APK từ link EAS cung cấp
- [ ] Chuyển APK vào điện thoại
- [ ] Cài đặt thành công (bật "Unknown sources")

### 2. Testing trên APK ✅
- [ ] App mở được
- [ ] Splash screen hiển thị
- [ ] Login thành công
- [ ] API calls hoạt động
- [ ] Tất cả screens load được
- [ ] Player hoạt động (nếu có)
- [ ] Upload/Download hoạt động
- [ ] Logout thành công

### 3. Performance ✅
- [ ] App không bị crash
- [ ] Không có lag nghiêm trọng
- [ ] Memory usage hợp lý
- [ ] Battery usage hợp lý

---

## 🔄 UPDATE EXISTING APK

Khi cần cập nhật app đã build:

### Option 1: Build APK mới (Full Update)
1. Sửa code
2. **Tăng versionCode** trong app.json
3. Build lại: `eas build -p android --profile preview`
4. Phát hành APK mới cho users

### Option 2: OTA Update (JS Only)
Nếu chỉ thay đổi code JS (không thay native):
```bash
# Cấu hình lần đầu
eas update:configure

# Push update
eas update --branch production --message "Mô tả update"
```
Users sẽ tự động nhận update khi mở app!

**Giới hạn**: Chỉ update được JS, không update được:
- Native modules mới
- Permissions mới
- Assets lớn

---

## 🐛 TROUBLESHOOTING

### "Build failed on Expo servers"
**Giải pháp**:
1. Kiểm tra logs: `eas build:view [build-id]`
2. Thường do dependencies conflict
3. Thử: `npm install --legacy-peer-deps`
4. Build lại

### "Cannot connect to API"
**Giải pháp**:
1. Kiểm tra `environment.js`
2. Ping backend từ browser: `http://your-api-url/api`
3. Tắt firewall/antivirus tạm thời
4. Đảm bảo backend chạy

### "APK không cài được"
**Giải pháp**:
1. Bật "Install from unknown sources"
2. Đảm bảo APK download đầy đủ (không bị corrupt)
3. Thử tải lại APK

### "App crash khi mở"
**Giải pháp**:
1. Kết nối điện thoại qua USB
2. Chạy: `adb logcat | grep ReactNativeJS`
3. Kiểm tra error logs
4. Thường do API URL sai hoặc backend không accessible

---

## 📊 VERSION HISTORY TEMPLATE

Ghi chú lại mỗi lần build để dễ track:

```
## Version 1.0.0 (versionCode: 1) - 2025-01-15
- Initial release
- Basic features: Login, Browse, Player

## Version 1.1.0 (versionCode: 2) - 2025-01-20
- Added: Search feature
- Fixed: Player bug
- Improved: UI/UX

## Version 1.2.0 (versionCode: 3) - 2025-01-25
- Added: Offline mode
- Fixed: Login issues
- Updated: API endpoints
```

---

## 🎯 QUICK REFERENCE

### Essential Commands
```bash
# Login
eas login

# Build preview APK
eas build -p android --profile preview

# Build production AAB
eas build -p android --profile production

# List builds
eas build:list

# View build details
eas build:view [build-id]

# OTA update
eas update --branch production

# Check credentials
eas credentials
```

### Important Files
- `app.json` - App configuration
- `eas.json` - Build profiles
- `src/config/environment.js` - Environment config
- `src/config/api.js` - API configuration
- `DEPLOYMENT.md` - Full deployment guide
- `QUICK_BUILD_GUIDE.md` - Quick start guide

---

## ✅ READY TO BUILD?

Nếu tất cả các mục trong checklist đã hoàn thành:

```bash
eas build -p android --profile preview
```

Chúc bạn build thành công! 🎉

---

**Ghi chú**:
- Lưu checklist này để dùng lại mỗi lần build
- Update version history sau mỗi release
- Backup keystore nếu build local (EAS tự động backup)
