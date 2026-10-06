# Clips workspace

- [x] Recreate the dark gold workspace shell and navigation.
- [x] Add video URL, upload, drag-and-drop, and mode controls.
- [x] Add AI tools, sample videos, and recent projects.
- [x] Add responsive desktop and mobile layouts.
- [x] Verify interactions, rendering, metadata, and build health.

# Editor hoàn chỉnh (hoàn thiện 06/10/2026)

- [x] Trang Editor `/editor/$projectId`: player xem trước, timeline đa clip, panel chỉnh sửa.
- [x] Tạo dự án từ link file video trực tiếp, upload/kéo-thả file, hoặc video mẫu.
- [x] Lưu trữ dự án thật: metadata trong localStorage, file video trong IndexedDB.
- [x] Timeline: chọn clip, tua/kéo playhead, chia clip tại playhead, nhân bản, xóa, chỉnh in/out, tốc độ 0.5–2x, âm lượng, tắt tiếng.
- [x] Caption: thêm/sửa/xóa theo mốc thời gian, xem trước trực tiếp, highlight từ khóa bằng `*dấu sao*`, xuất cháy hình.
- [x] Cắt khoảng lặng tự động bằng Web Audio (phân tích RMS ngay trên máy, không server).
- [x] Chia video dài thành nhiều short theo độ dài tùy chọn.
- [x] Xuất video thật bằng canvas + MediaRecorder (9:16 / 16:9 / 1:1, 2 mức chất lượng), tải file về máy.
- [x] Tự động lưu dự án, đánh dấu "đã xuất", xóa dự án kèm file.
- [x] TypeScript strict + ESLint sạch, build Vercel (`vercel-build`) thành công.

# Bổ sung tính năng (06/10/2026)

- [x] AI chấm điểm & đề xuất đoạn hay: quét âm thanh, chấm theo mật độ lời nói / độ lớn / cảm xúc, cắt đúng chỗ ngắt câu.
- [x] Xuất "mỗi clip thành 1 short" (nhiều file) bên cạnh "ghép cả timeline thành 1 video".
- [x] Hook mở đầu: câu hook khung vàng ở đầu video, xem trước và đốt vào video khi xuất.
- [x] Nhạc nền: thư viện nhạc (IndexedDB), nghe thử, trộn vào bản xem trước và bản xuất, chỉnh âm lượng.
- [x] Đồng bộ nhịp nhạc: dò BPM, cắt tròn độ dài clip theo số phách.
- [x] Caption: nhập file SRT/VTT, xuất SRT.
- [x] Thêm nhiều video vào một dự án; chế độ "Nhiều clip + Nhạc" nhận nhiều file cùng lúc.
- [x] Trang chủ: chế độ tạo áp dụng thật, ảnh bìa dự án, gắn sao lưu vĩnh viễn, chọn nhiều để xóa, xem tất cả.
- [x] Hộp thoại Giá cả, Thư viện âm thanh, Hồ sơ trên máy, Phản hồi và menu di động.
- [x] Xuất video không bị treo khi tab bị ẩn/cửa sổ bị che (hẹn giờ dự phòng cho requestAnimationFrame).
- [x] Sửa `scripts/prerender-index.mjs` chạy được trên Windows; `vercel.json` để mở lại trang `/editor/...` không bị 404.

# Còn lại

- [ ] Video mẫu dùng đường dẫn asset của Lovable (`/__l5e/...`) nên chỉ chạy trên hosting Lovable — cần thay bằng file thật khi deploy nơi khác.
- [ ] Nhận dạng giọng nói → caption tự động, tách nền / xóa vật thể, slide đồ họa AI (cần API AI + server).
- [ ] Nhập trực tiếp từ YouTube / Google Drive (cần server tải video).
- [ ] Đăng nhập online & lưu dự án trên đám mây.
