-- 1. Thêm cột giá và trạng thái premium cho bảng albums
ALTER TABLE albums
ADD COLUMN is_premium TINYINT(1) DEFAULT 0,
ADD COLUMN price DECIMAL(10, 2) DEFAULT 0.00;

-- 2. Tạo bảng purchased_albums để lưu lịch sử mua album
CREATE TABLE IF NOT EXISTS purchased_albums (
    purchase_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    album_id INT NOT NULL,
    price_paid DECIMAL(10, 2) NOT NULL,
    purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (album_id) REFERENCES albums(album_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_album (user_id, album_id)
);

-- 3. Cập nhật bảng revenue_sharing để hỗ trợ album
ALTER TABLE revenue_sharing
ADD COLUMN album_id INT NULL,
ADD CONSTRAINT fk_revenue_album FOREIGN KEY (album_id) REFERENCES albums(album_id) ON DELETE SET NULL;

-- Nếu cột share_type là ENUM, hãy chạy lệnh dưới đây (bỏ comment):
ALTER TABLE revenue_sharing MODIFY COLUMN share_type ENUM('direct_purchase', 'premium_stream', 'album_purchase');
