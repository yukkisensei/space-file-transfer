# 🚀 Space File Transfer

Một trang web chia sẻ file miễn phí với giao diện không gian vũ trụ và hiệu ứng liquid glass tuyệt đẹp.

## ✨ Tính năng

- 📤 **Upload File**: Kéo thả hoặc chọn file để upload
- 📥 **Download File**: Tải file thông qua mã hoặc link chia sẻ
- 🔒 **Bảo mật**: File được lưu trữ an toàn
- 🎨 **Giao diện đẹp**: Theme không gian vũ trụ với hiệu ứng liquid glass
- 📱 **Responsive**: Hoạt động tốt trên mọi thiết bị
- ⚡ **Nhanh chóng**: Upload và download tức thì

## 🎯 Cách sử dụng

### Upload File

1. Mở trang web
2. Kéo thả file vào vùng upload hoặc click "Chọn file"
3. File sẽ tự động upload
4. Copy link chia sẻ để gửi cho người khác

### Download File

1. Nhập mã file hoặc dán link vào ô input
2. Click "Tải xuống"
3. Xem thông tin file và click "Tải xuống" để download

## 🛠️ Công nghệ

- **HTML5**: Cấu trúc trang web
- **CSS3**: Styling với hiệu ứng liquid glass và animations
- **JavaScript**: Logic xử lý upload/download
- **LocalStorage**: Lưu trữ file tạm thời (demo)

## 🚀 Cài đặt

1. Clone hoặc download project
2. Mở file `index.html` trong trình duyệt
3. Hoặc sử dụng live server:

```bash
# Nếu có Python
python -m http.server 8000

# Nếu có Node.js và http-server
npx http-server
```

4. Truy cập `http://localhost:8000`

## 🎨 Tùy chỉnh

### Thay đổi màu sắc

Mở file `styles.css` và chỉnh sửa các biến CSS:

```css
:root {
    --primary-color: #6366f1;
    --secondary-color: #8b5cf6;
    --accent-color: #ec4899;
}
```

### Thay đổi thời gian hết hạn

Mở file `script.js` và tìm dòng:

```javascript
expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 ngày
```

## 📝 Lưu ý

- Project này sử dụng LocalStorage để lưu trữ file (giới hạn ~5-10MB)
- Để sử dụng thực tế, cần implement backend server để lưu trữ file
- File sẽ bị xóa khi clear browser cache

## 🔮 Tính năng tương lai

- [ ] Backend server với database
- [ ] Mã hóa file end-to-end
- [ ] Nén file trước khi upload
- [ ] Hỗ trợ upload folder
- [ ] Preview file trước khi download
- [ ] Quản lý file đã upload
- [ ] Thống kê download

## 📄 License

MIT License - Free to use

## 👨‍💻 Phát triển

Made with ❤️ 
By Yuu and Lt4c

---

**Made in Space** 🌌
