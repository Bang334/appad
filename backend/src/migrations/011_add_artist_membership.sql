-- Migration: Thêm chức năng hội viên theo từng artist
-- Tạo bảng artist_memberships để lưu thông tin đăng ký hội viên của user cho từng artist

CREATE TABLE IF NOT EXISTS artist_memberships (
    membership_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    artist_id INT NOT NULL,
    price_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiry_date DATETIME NOT NULL,
    status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (artist_id) REFERENCES artists(artist_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_artist (user_id, artist_id),
    INDEX idx_user_status (user_id, status),
    INDEX idx_artist_status (artist_id, status),
    INDEX idx_expiry (expiry_date)
);

-- Thêm cột membership_price vào bảng artists để artist có thể set giá hội viên
ALTER TABLE artists
ADD COLUMN membership_price DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Giá đăng ký hội viên (VNĐ)',
ADD COLUMN membership_duration_days INT DEFAULT 30 COMMENT 'Thời hạn hội viên (ngày)';

-- Cập nhật bảng revenue_sharing để hỗ trợ artist membership
ALTER TABLE revenue_sharing 
MODIFY COLUMN share_type ENUM('direct_purchase', 'premium_stream', 'album_purchase', 'artist_membership');

