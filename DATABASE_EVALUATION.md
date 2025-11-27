# 📊 Đánh giá và Đề xuất Mở rộng Database

## ✅ Các bảng hiện có (17 bảng)

### **Core Tables (11 bảng)**
1. ✅ `users` - Thông tin user (có balance, is_premium, premium_expiry)
2. ✅ `artists` - Thông tin artist (có balance, bank info)
3. ✅ `songs` - Bài hát (có is_premium, price)
4. ✅ `albums` - Albums
5. ✅ `genres` - Thể loại nhạc
6. ✅ `playlists` - Playlist của user
7. ✅ `playlist_songs` - Bài hát trong playlist (có order)
8. ✅ `favorites` - Bài hát yêu thích
9. ✅ `listening_history` - Lịch sử nghe nhạc
10. ✅ `comments` - Bình luận bài hát
11. ✅ `follows` - Theo dõi artist

### **Premium & Revenue Tables (6 bảng)**
12. ✅ `purchased_songs` - Bài hát đã mua
13. ✅ `transactions` - Lịch sử giao dịch users
14. ✅ `revenue_sharing` - Chia doanh thu 70/30
15. ✅ `premium_listening_stats` - Thống kê nghe premium
16. ✅ `artist_withdrawals` - Yêu cầu rút tiền
17. ✅ `platform_revenue` - Doanh thu platform

---

## 🔍 Đánh giá Database hiện tại

### **Điểm mạnh:**
- ✅ Cấu trúc rõ ràng, đầy đủ cho tính năng cốt lõi
- ✅ Hỗ trợ Premium subscription và Revenue sharing
- ✅ Có tracking cho listening stats
- ✅ Quản lý transactions và withdrawals tốt

### **Thiếu sót:**
- ❌ Không có notifications system
- ❌ Không có reporting/flagging system
- ❌ Không có social features (follow users, share)
- ❌ Không có analytics tracking
- ❌ Không có audit logs
- ❌ Không có caching mechanism
- ❌ Thiếu một số indexes quan trọng

---

## 🚀 Đề xuất Mở rộng Database

### **1. Notifications System** ⭐ QUAN TRỌNG

**Bảng: `notifications`**
```sql
CREATE TABLE notifications (
  notification_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('premium_expiring', 'withdrawal_approved', 'withdrawal_rejected', 
            'new_follower', 'new_comment', 'new_song', 'system') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSON, -- Thông tin bổ sung (song_id, artist_id, etc.)
  is_read TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_created (created_at)
);
```

**Lý do cần:**
- Thông báo premium sắp hết hạn
- Thông báo withdrawal được duyệt/từ chối
- Thông báo có người follow
- Thông báo có comment mới
- Push notifications

---

### **2. Reports & Moderation** ⭐ QUAN TRỌNG

**Bảng: `reports`**
```sql
CREATE TABLE reports (
  report_id INT PRIMARY KEY AUTO_INCREMENT,
  reporter_id INT NOT NULL, -- User báo cáo
  report_type ENUM('song', 'comment', 'user', 'artist', 'playlist') NOT NULL,
  target_id INT NOT NULL, -- ID của đối tượng bị báo cáo
  reason ENUM('spam', 'inappropriate', 'copyright', 'fake', 'other') NOT NULL,
  description TEXT,
  status ENUM('pending', 'reviewing', 'resolved', 'rejected') DEFAULT 'pending',
  reviewed_by INT NULL, -- Admin xử lý
  reviewed_at DATETIME NULL,
  admin_note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(user_id),
  FOREIGN KEY (reviewed_by) REFERENCES users(user_id),
  INDEX idx_status (status),
  INDEX idx_type_target (report_type, target_id)
);
```

**Lý do cần:**
- User có thể báo cáo nội dung không phù hợp
- Admin có thể quản lý và xử lý reports
- Bảo vệ platform khỏi spam, copyright issues

---

### **3. Social Features**

**Bảng: `user_follows`** (Follow users, không chỉ artists)
```sql
CREATE TABLE user_follows (
  follow_id INT PRIMARY KEY AUTO_INCREMENT,
  follower_id INT NOT NULL, -- User follow
  following_id INT NOT NULL, -- User được follow
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_follow (follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_follower (follower_id),
  INDEX idx_following (following_id)
);
```

**Bảng: `shares`** (Share songs/playlists)
```sql
CREATE TABLE shares (
  share_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL, -- User share
  share_type ENUM('song', 'playlist', 'album', 'artist') NOT NULL,
  target_id INT NOT NULL, -- ID của đối tượng được share
  platform ENUM('internal', 'facebook', 'twitter', 'whatsapp', 'copy_link') NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  INDEX idx_user_type (user_id, share_type),
  INDEX idx_target (share_type, target_id)
);
```

**Lý do cần:**
- Tăng engagement
- Viral marketing
- Social discovery

---

### **4. Analytics & Tracking**

**Bảng: `analytics_events`** (Track user behavior)
```sql
CREATE TABLE analytics_events (
  event_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL, -- NULL nếu chưa login
  event_type ENUM('screen_view', 'button_click', 'song_play', 'song_pause', 
                  'search', 'purchase', 'subscription', 'error') NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  properties JSON, -- Thông tin bổ sung
  session_id VARCHAR(100),
  device_info JSON, -- Device, OS, app version
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_user_event (user_id, event_type),
  INDEX idx_created (created_at),
  INDEX idx_session (session_id)
);
```

**Bảng: `song_analytics`** (Aggregated song stats)
```sql
CREATE TABLE song_analytics (
  analytics_id INT PRIMARY KEY AUTO_INCREMENT,
  song_id INT NOT NULL,
  date DATE NOT NULL,
  play_count INT DEFAULT 0,
  unique_listeners INT DEFAULT 0,
  total_duration INT DEFAULT 0, -- Tổng thời gian nghe (giây)
  skip_count INT DEFAULT 0,
  favorite_count INT DEFAULT 0,
  share_count INT DEFAULT 0,
  purchase_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_song_date (song_id, date),
  FOREIGN KEY (song_id) REFERENCES songs(song_id) ON DELETE CASCADE,
  INDEX idx_date (date),
  INDEX idx_song (song_id)
);
```

**Lý do cần:**
- Track user behavior để cải thiện UX
- Analytics cho artists
- Business intelligence
- A/B testing

---

### **5. Audit Logs** (Cho security & compliance)

**Bảng: `audit_logs`**
```sql
CREATE TABLE audit_logs (
  log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL, -- NULL nếu system action
  action_type ENUM('login', 'logout', 'register', 'password_change', 
                   'premium_subscribe', 'premium_cancel', 'purchase', 
                   'withdrawal', 'admin_action', 'delete', 'update') NOT NULL,
  resource_type ENUM('user', 'song', 'artist', 'album', 'playlist', 
                     'transaction', 'withdrawal') NULL,
  resource_id INT NULL,
  old_value JSON, -- Giá trị cũ (nếu update)
  new_value JSON, -- Giá trị mới
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_user_action (user_id, action_type),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created (created_at)
);
```

**Lý do cần:**
- Security tracking
- Compliance (GDPR, etc.)
- Debug issues
- Fraud detection

---

### **6. Caching & Performance**

**Bảng: `cache_metadata`** (Quản lý cache keys)
```sql
CREATE TABLE cache_metadata (
  cache_key VARCHAR(255) PRIMARY KEY,
  cache_type ENUM('trending_songs', 'popular_artists', 'user_premium', 
                  'song_access', 'playlist_songs') NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expires (expires_at),
  INDEX idx_type (cache_type)
);
```

**Lý do cần:**
- Quản lý cache invalidation
- Track cache performance
- Debug cache issues

---

### **7. Content Moderation**

**Bảng: `content_flags`** (Auto-flag content)
```sql
CREATE TABLE content_flags (
  flag_id INT PRIMARY KEY AUTO_INCREMENT,
  content_type ENUM('song', 'comment', 'playlist_name', 'user_bio') NOT NULL,
  content_id INT NOT NULL,
  flag_reason ENUM('explicit', 'spam_keywords', 'copyright_match', 
                   'inappropriate_language') NOT NULL,
  confidence_score DECIMAL(3,2), -- 0.00 - 1.00
  status ENUM('pending', 'reviewed', 'approved', 'rejected') DEFAULT 'pending',
  reviewed_by INT NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewed_by) REFERENCES users(user_id),
  INDEX idx_status (status),
  INDEX idx_content (content_type, content_id)
);
```

**Lý do cần:**
- Auto-detect inappropriate content
- Copyright protection
- Spam detection

---

### **8. User Preferences & Settings**

**Bảng: `user_preferences`**
```sql
CREATE TABLE user_preferences (
  preference_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  language VARCHAR(10) DEFAULT 'vi',
  theme ENUM('dark', 'light', 'auto') DEFAULT 'dark',
  autoplay TINYINT(1) DEFAULT 1,
  quality ENUM('low', 'medium', 'high', 'auto') DEFAULT 'auto',
  notifications_enabled TINYINT(1) DEFAULT 1,
  email_notifications TINYINT(1) DEFAULT 1,
  push_notifications TINYINT(1) DEFAULT 1,
  privacy_level ENUM('public', 'friends', 'private') DEFAULT 'public',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

**Lý do cần:**
- Personalization
- User experience
- Privacy controls

---

### **9. Playlist Collaboration**

**Bảng: `playlist_collaborators`**
```sql
CREATE TABLE playlist_collaborators (
  collaborator_id INT PRIMARY KEY AUTO_INCREMENT,
  playlist_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('owner', 'editor', 'viewer') DEFAULT 'editor',
  added_by INT NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_collab (playlist_id, user_id),
  FOREIGN KEY (playlist_id) REFERENCES playlists(playlist_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES users(user_id),
  INDEX idx_playlist (playlist_id),
  INDEX idx_user (user_id)
);
```

**Lý do cần:**
- Collaborative playlists
- Shared playlists
- Social features

---

### **10. Song Ratings & Reviews**

**Bảng: `song_ratings`** (Nếu muốn thay thế hoặc bổ sung comments)
```sql
CREATE TABLE song_ratings (
  rating_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  song_id INT NOT NULL,
  rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_rating (user_id, song_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs(song_id) ON DELETE CASCADE,
  INDEX idx_song (song_id),
  INDEX idx_user (user_id)
);
```

**Lý do cần:**
- Detailed feedback
- Better recommendations
- Quality control

---

## 📊 Tổng hợp Đề xuất

### **High Priority** (Nên làm ngay)
1. ✅ **notifications** - Thông báo cho users
2. ✅ **reports** - Báo cáo nội dung không phù hợp
3. ✅ **audit_logs** - Security & compliance
4. ✅ **user_preferences** - User experience

### **Medium Priority** (Làm sau)
5. ⏳ **user_follows** - Social features
6. ⏳ **shares** - Viral marketing
7. ⏳ **analytics_events** - User behavior tracking
8. ⏳ **song_analytics** - Aggregated stats

### **Low Priority** (Nice to have)
9. ⏳ **playlist_collaborators** - Collaborative playlists
10. ⏳ **song_ratings** - Detailed ratings
11. ⏳ **content_flags** - Auto-moderation
12. ⏳ **cache_metadata** - Cache management

---

## 🔧 Cải thiện Indexes

### **Cần thêm indexes cho các bảng hiện có:**

```sql
-- users
ALTER TABLE users ADD INDEX idx_email (email);
ALTER TABLE users ADD INDEX idx_username (username);
ALTER TABLE users ADD INDEX idx_premium (is_premium, premium_expiry);

-- songs
ALTER TABLE songs ADD INDEX idx_title (title);
ALTER TABLE songs ADD INDEX idx_artist_album (artist_id, album_id);
ALTER TABLE songs ADD INDEX idx_premium_price (is_premium, price);
ALTER TABLE songs ADD INDEX idx_created (created_at);

-- transactions
ALTER TABLE transactions ADD INDEX idx_user_created (user_id, created_at);
ALTER TABLE transactions ADD INDEX idx_type_status (type, status);

-- listening_history
ALTER TABLE listening_history ADD INDEX idx_user_date (user_id, listened_at);
ALTER TABLE listening_history ADD INDEX idx_song_date (song_id, listened_at);

-- comments
ALTER TABLE comments ADD INDEX idx_song_created (song_id, created_at);
ALTER TABLE comments ADD INDEX idx_user_created (user_id, created_at);

-- playlist_songs
ALTER TABLE playlist_songs ADD INDEX idx_playlist_order (playlist_id, `order`);
```

---

## 📝 Kết luận

Database hiện tại **đã đủ tốt** cho các tính năng cốt lõi. Tuy nhiên, để scale và cải thiện UX, nên bổ sung:

1. **Notifications** - Quan trọng nhất cho user engagement
2. **Reports** - Cần thiết cho content moderation
3. **Analytics** - Quan trọng cho business growth
4. **Audit Logs** - Cần thiết cho security

Các tính năng social và collaboration có thể thêm sau khi đã có user base ổn định.

