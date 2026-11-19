# LBUNS

## Linux v1.4.5.2

Kho mã nguồn hiện chỉ phát hành ứng dụng Windows. Thư mục [`linux/`](linux/) tạo bản Linux x64 từ **release v1.4.5 đã kiểm tra SHA-256**, thay runtime Electrobun bằng bản Linux và áp dụng các thay đổi có kiểm tra đúng phiên bản. Script không tải hay lưu token LMS.

Yêu cầu: Linux x64 có GTK 3, WebKit2GTK 4.1, Node.js, `curl`, `unzip`, `zstd` và `tar`. Trên Ubuntu/Debian, gói WebKit thường là `libwebkit2gtk-4.1-0`.

```bash
bash linux/build.sh
linux/dist/LBUNS-v1.4.5-linux.2/run.sh
```

Có thể truyền đường dẫn thư mục đầu ra vào `linux/build.sh`. Dữ liệu người dùng mặc định ở `~/.local/share/LBUNS-Linux/Data`; đặt `LBUNS_DATA_DIR` nếu muốn đổi. Chạy thử không cần LMS bằng `LBUNS_DEMO=1 linux/dist/LBUNS-v1.4.5-linux.2/run.sh`.

Ở cửa sổ rộng từ 1000 px, “Bài học” và “Tác vụ” nằm thành hai cột dọc cạnh nhau; màn hình hẹp vẫn xếp trên–dưới. Bảng “Bài học” luôn mở trong khi kết nối, kể cả lúc tác vụ đang chạy. Khi kết nối LMS, ứng dụng tự tải bài học của lớp đầu tiên và tải trước bài học của các lớp còn lại (tối đa hai yêu cầu đồng thời). Chọn lớp khác dùng dữ liệu đã tải; nút Đồng bộ vẫn làm mới dữ liệu. Các bài có ngày mở trong tương lai vẫn hiển thị là “Chưa mở” nhưng không thể chọn hoặc chạy trước thời hạn.

Khi một tác vụ báo lỗi 401/Unauthorized, ứng dụng tự hiện hộp nhập token mới. Nếu phiên còn chạy, người dùng bấm “Kết nối lại” sẽ dừng phiên đó trước khi dùng token mới. Tác vụ đã lỗi không tự chạy lại; hãy kiểm tra LMS rồi chọn chạy lại khi phù hợp. Token chỉ giữ trong phiên ứng dụng.

## Lấy token từ trang LMS của chính bạn

Mở trang LMS đã đăng nhập, mở Developer Tools → Console, dán **toàn bộ nội dung** [`docs/token-console.js`](docs/token-console.js) rồi nhấn Enter. Sau đó thao tác trên trang để tạo một request LMS. Script bắt `Authorization: Bearer …` từ `fetch` hoặc XHR, copy token đầu tiên vào clipboard rồi tự gỡ hook. Script không ghi token ra Console hay gửi đến máy chủ khác. Chỉ dán token vào LBUNS của bạn; không chia sẻ token hoặc ảnh chụp chứa token.

Đây là mã cho Console, **không** thêm tiền tố `javascript:`. Đoạn bookmarklet cũ có ký tự `%27` chưa giải mã nên không chạy được khi dán thẳng vào Console.
