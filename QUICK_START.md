# ⚡ QUICK START - 5 PHÚT CHẠY ĐƯỢC!

## 🎯 Mục tiêu
Chạy được website file transfer với backend trong 5 phút!

---

## 📋 Checklist

### ✅ Bước 1: Cài Node.js (nếu chưa có)
1. Tải từ: https://nodejs.org/
2. Chọn bản LTS (Long Term Support)
3. Cài đặt bình thường (Next, Next, Next...)
4. Kiểm tra:
```bash
node --version
# Phải hiện: v18.x.x hoặc cao hơn
```

---

### ✅ Bước 2: Cài Dependencies
Mở **Terminal** trong thư mục `C:/Project`:

**Windows PowerShell:**
```powershell
cd C:\Project
npm install
```

**Windows CMD:**
```cmd
cd C:\Project
npm install
```

**Git Bash / Linux / Mac:**
```bash
cd /c/Project
npm install
```

**Đợi khoảng 30 giây...** ☕

---

### ✅ Bước 3: Chạy Server
```bash
npm start
```

**Thấy dòng này là thành công:**
```
🌌 ═══════════════════════════════════════════════
   SPACE FILE TRANSFER SERVER
🌌 ═══════════════════════════════════════════════

🚀 Server running on: http://localhost:3000
```

---

### ✅ Bước 4: Mở Website
1. Mở trình duyệt
2. Vào: **http://localhost:3000**
3. Thấy giao diện không gian vũ trụ ✨

---

### ✅ Bước 5: Test Upload
1. Click **"Upload"** tab
2. Kéo thả file hoặc click "Chọn file"
3. File sẽ upload lên server
4. Copy link chia sẻ
5. Paste link vào tab **"Download"**
6. Download file về!

---

## 🎉 XONG RỒI!

Bây giờ bạn có:
- ✅ Backend server chạy trên Node.js
- ✅ Upload file lên server thực
- ✅ Download file từ server
- ✅ Chia sẻ link với người khác (trong cùng mạng)

---

## 🌐 Chia sẻ với người khác (cùng WiFi)

### Bước 1: Lấy IP của máy bạn

**Windows:**
```powershell
ipconfig
# Tìm dòng "IPv4 Address": 192.168.x.x
```

**Mac/Linux:**
```bash
ifconfig
# Hoặc
ip addr show
```

### Bước 2: Chia sẻ link
Thay `localhost` bằng IP của bạn:
```
http://192.168.1.100:3000
```

Bạn bè trong cùng WiFi có thể truy cập!

---

## 🚀 Deploy lên Internet

Xem file **BACKEND_GUIDE.md** phần "Deploy lên Internet" để:
- Deploy lên Railway (Free)
- Deploy lên Render (Free)
- Deploy lên VPS

---

## 🐛 Gặp lỗi?

### "npm: command not found"
➡️ Chưa cài Node.js, quay lại Bước 1

### "Port 3000 already in use"
➡️ Đổi port trong `server.js`:
```javascript
const PORT = process.env.PORT || 3001; // Đổi thành 3001
```

### "Cannot find module"
➡️ Chạy lại `npm install`

### Không upload được file
➡️ Kiểm tra:
1. Server có đang chạy không?
2. Console có báo lỗi gì không?
3. File có quá 100MB không?

---

## 📚 Đọc thêm

- **BACKEND_GUIDE.md**: Hướng dẫn chi tiết về backend
- **README.md**: Thông tin tổng quan về project

---

## 💡 Tips

### Chạy ở chế độ Development (auto-restart)
```bash
npm run dev
```

### Dừng server
Nhấn **Ctrl + C** trong terminal

### Xem log
Server sẽ in log mỗi khi có upload/download:
```
✅ File uploaded: document.pdf (Code: abc123)
📥 File downloaded: document.pdf (Code: abc123)
```

---

**Happy Coding! 🚀✨**
