# Giao diện ứng dụng chỉnh video Clips

## Mục tiêu

Dựng màn hình chính bám sát ảnh tham chiếu: nền đen, điểm nhấn vàng, bố cục rộng và dày tính năng; ảnh tham chiếu chỉ dùng để định hướng, không nhúng trực tiếp.

## Nội dung thực hiện

- Tạo thanh trên cùng với logo Clips, đường dẫn sản phẩm, giá, dự án, âm thanh và đăng nhập.
- Tạo thanh điều hướng trái thu gọn với trạng thái Trang chủ đang chọn.
- Tạo khu nhập nội dung trung tâm gồm ô dán liên kết YouTube/Drive, nút lấy video, kéo-thả/tải tệp và nhóm loại nội dung.
- Tạo dải công cụ AI đầy đủ theo ảnh: sửa video, đồng bộ nhạc, lọc im lặng, AI chấm điểm, tạo short, phụ đề, hook mở đầu, caption, cắt khoảng lặng, slideshow và lọc âm.
- Tạo 6 thẻ video mẫu dọc bằng ảnh minh họa mới; có nút xem và trạng thái chọn.
- Tạo khu dự án gần đây với tab, thẻ tiến độ, thời lượng, ngày tạo, nút yêu thích và chọn nhiều.
- Hoàn thiện tương tác tải tệp, chọn chế độ, chọn video mẫu, chuyển tab, yêu thích và nút tài khoản/dự án bằng phản hồi trực quan.
- Điều chỉnh giao diện cho cả màn hình rộng và điện thoại, giữ đúng mật độ và tỷ lệ của ảnh tham chiếu.

## Kỹ thuật

- Dùng React/TanStack hiện có và Tailwind CSS v4.
- Màu sắc, bóng, font và kích thước được định nghĩa bằng hệ thống biến giao diện chung.
- Dùng ảnh tạo mới trong `src/assets`; các vị trí media còn thiếu dùng khung trạng thái rõ ràng để bổ sung sau.
- Thêm tiêu đề và mô tả chia sẻ riêng cho trang chủ.
- Kiểm tra bản xem trước ở kích thước máy tính và điện thoại, đồng thời xử lý lỗi hiển thị nếu có.
