# 🌐 Hướng dẫn Deploy Backend lên Production

Để APK hoạt động ở mọi nơi (không chỉ mạng LAN), bạn cần deploy backend lên server cloud.

---

## 🎯 Các Option Deploy Backend

### Option 1: Railway.app (KHUYẾN NGHỊ - Miễn phí $5/tháng)
✅ Dễ setup
✅ Tự động deploy từ Git
✅ Database PostgreSQL/MySQL miễn phí
✅ HTTPS tự động

### Option 2: Render.com (Miễn phí có giới hạn)
✅ Miễn phí hoàn toàn (có giới hạn)
✅ Setup đơn giản
⚠️ Server sleep sau 15 phút không dùng

### Option 3: Heroku (Trả phí)
✅ Ổn định
✅ Nhiều add-ons
❌ Không còn free tier

### Option 4: AWS/DigitalOcean (Chuyên nghiệp)
✅ Mạnh mẽ, scalable
✅ Nhiều tùy chỉnh
❌ Phức tạp hơn
❌ Đắt hơn

---

## 🚀 HƯỚNG DẪN CHI TIẾT: Deploy lên Railway.app

### Bước 1: Chuẩn bị Backend

#### 1.1. Đảm bảo có file `package.json` với start script
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

#### 1.2. Tạo file `.env` template (.env.example)
```env
PORT=5000
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
NODE_ENV=production
```

#### 1.3. Update code để dùng environment variables
```javascript
// server.js
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### 1.4. Đảm bảo có `.gitignore`
```
node_modules/
.env
*.log
```

### Bước 2: Setup Railway

1. **Tạo tài khoản**: https://railway.app/
2. **Đăng nhập bằng GitHub**
3. **New Project** → **Deploy from GitHub repo**
4. **Chọn repository backend** của bạn

### Bước 3: Cấu hình

1. **Add Database** (nếu cần):
   - Click "New" → "Database" → "PostgreSQL" hoặc "MySQL"
   - Railway tự động tạo và cung cấp DATABASE_URL

2. **Add Environment Variables**:
   - Settings → Variables
   - Thêm các biến:
     ```
     NODE_ENV=production
     JWT_SECRET=your-secret-key-here
     PORT=5000
     ```

3. **Deploy**:
   - Railway tự động build và deploy
   - Chờ 2-5 phút

### Bước 4: Lấy URL

1. Sau khi deploy xong, vào **Settings** → **Domains**
2. Click **Generate Domain**
3. Bạn sẽ có URL như: `https://yourapp.railway.app`

### Bước 5: Update Mobile App

Cập nhật `mobile/src/config/environment.js`:
```javascript
production: {
  API_BASE_URL: 'https://yourapp.railway.app/api',
  SOCKET_URL: 'https://yourapp.railway.app',
  ENV_NAME: 'Production',
  DEBUG: false,
}
```

### Bước 6: Test

```bash
# Test API từ browser hoặc Postman
GET https://yourapp.railway.app/api/health

# Test từ mobile app
# Đổi ENV trong environment.js thành 'production'
npx expo start
```

---

## 🌟 HƯỚNG DẪN CHI TIẾT: Deploy lên Render.com

### Bước 1: Tạo tài khoản
- Vào https://render.com/
- Sign up with GitHub

### Bước 2: New Web Service
1. Dashboard → **New** → **Web Service**
2. Kết nối GitHub repo
3. Chọn backend repository

### Bước 3: Cấu hình
```
Name: music-app-backend
Environment: Node
Build Command: npm install
Start Command: npm start
```

### Bước 4: Environment Variables
Thêm:
```
NODE_ENV=production
JWT_SECRET=your-secret
PORT=5000
```

### Bước 5: Deploy
- Click **Create Web Service**
- Đợi 5-10 phút
- URL: `https://your-app.onrender.com`

⚠️ **Lưu ý**: Free tier sleep sau 15 phút không hoạt động, request đầu tiên sẽ chậm (30-60s).

---

## 🗄️ Setup Database trên Cloud

### Option 1: Railway Database (Khuyến nghị với Railway)
- Tự động tích hợp
- Connection string tự động
- Miễn phí 500MB

### Option 2: ElephantSQL (PostgreSQL miễn phí)
1. Tạo tài khoản: https://www.elephantsql.com/
2. Create new instance (Free tier: 20MB)
3. Copy URL
4. Add vào environment: `DATABASE_URL=postgres://...`

### Option 3: MongoDB Atlas (MongoDB miễn phí)
1. Tạo tài khoản: https://www.mongodb.com/cloud/atlas
2. Create cluster (Free M0)
3. Get connection string
4. Add vào environment: `MONGODB_URI=mongodb+srv://...`

---

## 🔒 Security Checklist

Trước khi deploy production:

- [ ] **Environment Variables**: Không hardcode secrets trong code
- [ ] **CORS**: Cấu hình CORS đúng
  ```javascript
  app.use(cors({
    origin: ['https://yourapp.com', 'exp://192.168.*.*'],
    credentials: true
  }));
  ```
- [ ] **Rate Limiting**: Thêm rate limiter
  ```bash
  npm install express-rate-limit
  ```
- [ ] **Helmet**: Security headers
  ```bash
  npm install helmet
  ```
- [ ] **HTTPS**: Đảm bảo dùng HTTPS (Railway/Render tự động)
- [ ] **Database**: Backup database thường xuyên
- [ ] **Error Handling**: Không expose stack traces
- [ ] **Auth**: JWT secret mạnh, expire tokens hợp lý

---

## 📊 Monitoring & Logs

### Railway
- Logs: Dashboard → Project → Logs tab
- Metrics: CPU, Memory, Network tự động

### Render
- Logs: Dashboard → Service → Logs
- Metrics: Dashboard → Service → Metrics

### Add logging service (Optional)
- LogRocket
- Sentry
- DataDog

---

## 🔄 Auto Deploy

### Railway
✅ Tự động deploy khi push to GitHub
- Settings → Deployments → Auto Deploy: ON

### Render
✅ Tự động deploy khi push
- Settings → Build & Deploy → Auto-Deploy: Yes

---

## 💰 Chi phí ước tính

### Railway (Khuyến nghị cho start-up)
- **Free**: $5 credit/tháng
- **Hobby**: $5/tháng (unlimited usage trong giới hạn)
- Database: Miễn phí 500MB

### Render
- **Free**: Miễn phí hoàn toàn (có giới hạn)
- **Starter**: $7/tháng (không sleep)
- Database: $7/tháng

### AWS (Cho scale lớn)
- **EC2 t2.micro**: ~$10/tháng
- **RDS**: ~$15/tháng
- Total: ~$25/tháng

---

## 🎯 Recommendation

**Cho học tập / MVP / Startup nhỏ**:
→ **Railway** hoặc **Render Free Tier**

**Cho sản phẩm có users thật**:
→ **Railway Hobby** ($5/tháng)

**Cho startup đang phát triển**:
→ **Render Starter** hoặc **DigitalOcean** ($7-20/tháng)

**Cho enterprise**:
→ **AWS** / **Google Cloud**

---

## ✅ Quick Start (Railway)

```bash
# 1. Đảm bảo backend có Git
cd e:\appad\backend
git init
git add .
git commit -m "Initial commit"

# 2. Push to GitHub
# Tạo repo mới trên GitHub
git remote add origin https://github.com/yourname/music-app-backend.git
git push -u origin main

# 3. Deploy
# Vào railway.app → New Project → Deploy from GitHub
# Chọn repo → Configure → Deploy!

# 4. Get URL and update mobile app
# Copy URL từ Railway
# Update environment.js với URL mới
```

---

Sau khi deploy xong backend, mobile app của bạn sẽ hoạt động ở MỌI NƠI! 🌍
