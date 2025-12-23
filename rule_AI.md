# PROJECT DEVELOPMENT RULES

## 1. MỤC ĐÍCH VÀ MỤC TIÊU
Tài liệu định nghĩa các quy tắc bắt buộc áp dụng cho mọi loại dự án (Backend, Frontend, Mobile, Desktop) và mọi ngôn ngữ lập trình.

**Mục tiêu:**
- Code dễ đọc, dễ bảo trì.
- Loại bỏ sự trùng lặp (DRY).
- Kiến trúc rõ ràng và nhất quán.
- Kiểm soát AI sinh code không phá vỡ cấu trúc dự án.

## 2. NGUYÊN TẮC CỐT LÕI
### Single Responsibility (Đơn nhiệm)
- Mỗi file, module, hoặc class chỉ thực hiện một nhiệm vụ duy nhất.
- Không trộn lẫn nhiều trách nhiệm khác nhau vào cùng một thực thể.

### DRY (Don't Repeat Yourself)
- Không lặp lại logic, style, cấu hình hoặc validation.
- Logic xuất hiện từ 2 nơi trở lên bắt buộc phải tách thành module chung.
- **Nghiêm cấm:** Copy-paste code hoặc viết code tạm bợ gây trùng lặp.

## 3. QUẢN LÝ UI VÀ STYLE
### Quy tắc chung
- Không viết style trực tiếp trong file logic trừ khi chỉ sử dụng duy nhất một lần và không có khả năng tái sử dụng.
- Style dùng chung (màu sắc, spacing, typography, layout) phải đặt trong các module/file định nghĩa tập trung (ví dụ: `/styles` hoặc `/theme`).

### Triển khai
- Các file logic chỉ import và sử dụng style, không định nghĩa lại các tham số cơ bản.
- Khi cần viết style riêng, nếu phát hiện có thể dùng lại sau này, phải chủ động tách ra file chung ngay lập tức.

## 4. QUẢN LÝ LOGIC TÁI SỬ DỤNG
### Tổ chức logic chung
- Logic dùng chung phải đặt trong các thư mục định danh rõ ràng như: `utils/`, `helpers/`, `services/`, hoặc `shared/`.
- Áp dụng cho: Xử lý date/time, validate, format dữ liệu, transform dữ liệu...

### Hạn chế
- Không viết lại cùng một logic ở nhiều nơi.
- Không xử lý nghiệp vụ phức tạp ngay trong file giao diện (UI).
- Chia nhỏ các hàm quá dài thành các hàm con có tên gọi tường minh.

## 5. CẤU TRÚC THƯ MỤC VÀ TỔ CHỨC FILE
- **Phân loại theo chức năng:** Các file phải được phân chia vào các thư mục có chức năng tương ứng (ví dụ: `components/`, `screens/`, `services/`, `models/`, `controllers/`, `routes/`).
- **Tránh tập trung quá mức:** Tuyệt đối không để quá nhiều file không cùng loại vào một thư mục gốc. Mỗi module lớn nên có thư mục riêng.
- **Tính nhất quán:** Tên thư mục phải thống nhất và phản ánh đúng nội dung bên trong.

## 6. KIỂM SOÁT KÍCH THƯỚC FILE
### Dấu hiệu cần Refactor
- File quá dài (thường trên 300-500 dòng tùy ngữ cảnh).
- Một file chứa quá nhiều hàm và biến không liên quan chặt chẽ.
- File trộn lẫn giữa Logic, Data, UI và IO.

### Giải pháp
- Thực hiện tách nhỏ thành các sub-module, component hoặc helper ngay khi phát hiện file bắt đầu "phình to".

## 7. KIẾN TRÚC VÀ PHÂN LỚP
- Đảm bảo ranh giới rõ ràng giữa các tầng: UI không làm việc trực tiếp với Database, Business Logic không trộn lẫn với Giao diện.
- Layer cấp cao không phụ thuộc trực tiếp vào chi tiết thực thi của Layer cấp thấp.

## 8. ĐẶT TÊN VÀ ĐỘ ĐỌC HIỂU
- Tên biến/hàm phải tự giải thích (Self-explanatory).
- Tránh viết tắt trừ các thuật ngữ chuyên ngành phổ biến.
- Biến Boolean phải bắt đầu bằng: `is`, `has`, `can`, `should`.
- Ưu tiên code rõ ràng, dễ hiểu hơn là code "ngắn gọn" nhưng lắt léo.

## 9. XỬ LÝ LỖI (ERROR HANDLING)
- **Tập trung:** Backend phải có cơ chế catch lỗi tập trung hoặc xử lý triệt để tại tầng Controller.
- **Tường minh:** Trả về mã lỗi HTTP hợp lệ và thông báo lỗi rõ ràng cho phía Client.
- **Tuyệt đối:** Không để lộ stack trace hoặc thông tin hệ thống nhạy cảm trong phản hồi lỗi.

## 10. BẢO MẬT VÀ BIẾN MÔI TRƯỜNG
- **Biến môi trường:** Tuyệt đối không hardcode thông tin nhạy cảm (API Key, Mật khẩu, URL DB) vào source code. Sử dụng file `.env`.
- **Validation:** Mọi dữ liệu đầu vào từ phía người dùng phải được kiểm tra (validate) và làm sạch trước khi xử lý hoặc lưu trữ.

## 11. COMMENT VÀ DOCUMENTATION
- Chỉ comment cho logic đặc biệt phức tạp, các quyết định kiến trúc quan trọng hoặc các trường hợp đặc biệt (edge cases).
- Không comment mô tả những gì code đã thể hiện rõ ràng.

## 12. ĐỘ ỔN ĐỊNH VÀ TESTING
- Khi thay đổi logic, phải kiểm tra tất cả các phần liên quan bị ảnh hưởng.
- Không được phép bỏ qua các lỗi cảnh báo (warnings) hoặc lỗi biên dịch.
- Không comment out code cũ rồi để đó (phải dùng Git để quản lý phiên bản).

## 13. QUY CHUẨN GIT & COMMIT
- **Thông điệp commit:** Sử dụng các tiền tố rõ ràng: `feat:` (tính năng mới), `fix:` (sửa lỗi), `refactor:` (tối ưu code), `docs:` (tài liệu).
- **Phạm vi:** Mỗi commit nên giải quyết một vấn đề cụ thể, tránh commit quá nhiều thay đổi không liên quan cùng lúc.

## 14. QUY TẮC DÀNH RIÊNG CHO AI ASSISTANT
AI phải tuân thủ các bước sau trước khi đề xuất code:
1. **Ngôn ngữ:** Luôn luôn phản hồi và trao đổi bằng tiếng Việt.
2. **Lệnh Terminal (Windows):** Nếu cần thực hiện từ 2 lệnh trở lên trên cùng một dòng, phải sử dụng dấu `;` để ngăn cách thay vì `&&` (Ví dụ: `cd backend; npm run dev`).
3. **Khảo sát:** Tìm kiếm xem logic hoặc style tương tự đã tồn tại trong dự án chưa.
4. **Tái sử dụng:** Ưu tiên sử dụng code hiện có thay vì sinh mới.
5. **Đúng cấu trúc:** Tuân thủ tuyệt đối cấu trúc thư mục và pattern của dự án.
6. **Tương tác:** Hỏi ý kiến người dùng khi không chắc chắn về việc nên viết chung hay riêng.
7. **Cấm:** Không tạo file/logic trùng lặp, không phá vỡ ranh giới giữa các layer.