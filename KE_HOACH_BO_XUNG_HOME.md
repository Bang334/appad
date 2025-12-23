# Kế Hoạch Bổ Sung Tính Năng Home Screen

## Mục tiêu
Bổ sung thêm 2 danh sách nhạc mới vào màn hình Home:
1.  **Nhạc tủ (Hay nghe):** Các bài hát user nghe nhiều nhất trong thời gian gần đây. Giúp user truy cập nhanh các bài hát yêu thích.
2.  **Nhạc gợi ý (Có thể bạn sẽ thích):** Các bài hát được gợi ý dựa trên lịch sử nghe, nghệ sĩ đã follow, thể loại yêu thích. Tập trung vào các bài hát user chưa nghe hoặc ít nghe.

---

## 1. Backend Implementation

### 1.1. Mod `HistoryModel` (`backend/src/models/history.model.js`)
Thêm phương thức `getFrequentSongs(userId, limit)`:
-   **Logic:** Truy vấn bảng `listening_history`, group theo `song_id`, tính tổng `count` (số lần nghe).
-   **Filter:** Chỉ lấy lịch sử trong 30 ngày gần nhất để đảm bảo tính "gần đây".
-   **Sort:** Sắp xếp theo tổng lượt nghe giảm dần (`DESC`).
-   **Join:** Join với bảng `songs`, `artists` để lấy thông tin chi tiết bài hát.

### 1.2. Mod `SongModel` (`backend/src/models/song.model.js`)
Thêm phương thức `getRecommendations(userId, limit)`:
-   **Logic:**
    1.  **Lấy sở thích User:**
        -   Top Genres: Lấy top 3 thể loại user nghe nhiều nhất từ `listening_history`.
        -   Followed Artists: Lấy danh sách nghệ sĩ user đang follow từ bảng `follows`.
        -   Top Artists: Lấy top 5 nghệ sĩ user nghe nhiều nhất từ `listening_history`.
    2.  **Query Songs:**
        -   Tìm các bài hát thuộc Top Genres HOẶC của Followed/Top Artists.
        -   **Exclusion (Quan trọng):** LOẠI BỎ (NOT IN) các bài hát user đã nghe trong `listening_history`.
    3.  **Ranking:**
        -   Ưu tiên bài hát mới (release_date).
        -   Ưu tiên bài hát có `listen_count` cao (mọi người đều nghe).
        -   Trộn ngẫu nhiên (Random) một chút để tạo sự mới mẻ mỗi lần load.

### 1.3. Mod `SongController` (`backend/src/controllers/song.controller.js`)
Thêm 2 phương thức mới:
-   `getFrequent(req, res)`: Gọi `HistoryModel.getFrequentSongs`.
-   `getRecommendations(req, res)`: Gọi `SongModel.getRecommendations`.

### 1.4. Update Routes (`backend/src/routes/song.routes.js`)
Đăng ký 2 API endpoint mới:
-   `GET /frequent`: `authMiddleware`, `SongController.getFrequent`
-   `GET /recommendations`: `authMiddleware`, `SongController.getRecommendations`

---

## 2. Frontend Implementation (Mobile)

### 2.1. Update Service (`mobile/src/services/songService.js`)
Thêm 2 hàm gọi API:
-   `getFrequentSongs(limit)`
-   `getRecommendedSongs(limit)`

### 2.2. Update UI (`mobile/src/screens/Home/HomeScreen.js`)
-   **State Management:**
    -   Thêm state `frequentSongs` và `recommendedSongs`.
    -   Thêm state `loading` riêng cho từng phần hoặc dùng chung.
-   **Load Data:**
    -   Cập nhật hàm `loadData()` để gọi song song `getFrequentSongs` và `getRecommendedSongs` cùng với các request hiện tại (`Promise.all`).
-   **UI Layout:**
    -   Thêm section **"Nhạc tủ của bạn"** (Hiển thị nếu `frequentSongs.length > 0`).
        -   Dùng `FlatList` horizontal.
        -   Card bài hát hiển thị ảnh bìa, tên bài, tên ca sĩ.
    -   Thêm section **"Có thể bạn sẽ thích"** (Hiển thị nếu `recommendedSongs.length > 0`).
        -   Dùng `FlatList` horizontal.
        -   Card bài hát tương tự nhưng có thể thêm label "Gợi ý" hoặc style khác biệt chút.

---

## 3. Chi tiết Logic Gợi Ý (Algorithm)

Để gợi ý chính xác mà không quá phức tạp (do chưa có hệ thống AI/ML), ta dùng **Rule-based filtering**:

**Bước 1: Candidates Generation (Tạo danh sách ứng viên)**
-   Lấy tất cả bài hát từ nghệ sĩ user follow.
-   Lấy tất cả bài hát thuộc 3 thể loại user nghe nhiều nhất (tính theo tổng duration nghe).

**Bước 2: Filtering (Lọc)**
-   Loại bỏ các bài nằm trong top 50 bài user nghe nhiều nhất (để tránh suggest lại nhạc tủ).
-   Loại bỏ các bài user đã nghe trong 7 ngày qua.

**Bước 3: Scoring & Ranking (Xếp hạng)**
-   Điểm cơ bản = `listen_count` (độ phổ biến toàn hệ thống).
-   Bonus điểm:
    -   `+20%` nếu thuộc nghệ sĩ user follow.
    -   `+10%` nếu thuộc thể loại user nghe nhiều nhất.
    -   `+10%` nếu là bài hát mới ra mắt (release_date < 30 ngày).

**Bước 4: Result**
-   Lấy Top N bài có điểm cao nhất.
-   Shuffle (trộn) ngẫu nhiên top N này để mỗi lần F5 user thấy khác đi một chút.
