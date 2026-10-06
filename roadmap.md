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
