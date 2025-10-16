# 🏠 HƯỚNG DẪN HOST LOCAL VỚI NGROK

Hướng dẫn host website trên máy tính cá nhân và chia sẻ ra internet bằng Ngrok.

---

## 🎯 MỤC ĐÍCH

- Host website trên máy Windows của bạn
- Chia sẻ link public ra internet
- Không cần VPS, không cần port forwarding
- Chạy khi nào cần, tắt khi xong
- **HOÀN TOÀN MIỄN PHÍ**

---

## 📋 YÊU CẦU

- ✅ Máy Windows (đã có)
- ✅ Node.js đã cài (đã có)
- ✅ Code đã setup (đã có)
- ✅ Internet connection

---

## ⚡ BƯỚC 1: Tải Ngrok

### 1.1. Download Ngrok

1. Vào: **https://ngrok.com/download**
2. Click **"Download for Windows"**
3. Giải nén file ZIP vào `C:\ngrok`

Sau khi giải nén, bạn sẽ có file `C:\ngrok\ngrok.exe`

---

## 🔑 BƯỚC 2: Tạo tài khoản Ngrok (Free)

### 2.1. Sign Up

1. Vào: **https://dashboard.ngrok.com/signup**
2. Chọn **"Sign up with Google"** hoặc **"Sign up with GitHub"** (nhanh nhất)
3. Hoặc dùng email thường

### 2.2. Lấy Authtoken

1. Sau khi login, vào: **https://dashboard.ngrok.com/get-started/your-authtoken**
2. Click **"Copy"** để copy authtoken
3. Token sẽ dạng: `2abc123def456ghi789jkl...`

---

## 🔧 BƯỚC 3: Setup Ngrok

Mở **PowerShell** hoặc **CMD**:

```powershell
cd C:\ngrok
.\ngrok config add-authtoken YOUR_TOKEN_HERE
```

**⚠️ QUAN TRỌNG:** Thay `YOUR_TOKEN_HERE` bằng token bạn vừa copy!

**Ví dụ:**
```powershell
.\ngrok config add-authtoken 2abc123def456ghi789jkl
```

Thấy dòng này là thành công:
```
Authtoken saved to configuration file: C:\Users\YourName\.ngrok2\ngrok.yml
```

---

## 🚀 BƯỚC 4: Chạy Website

### 4.1. Start Server (Terminal 1)

Mở **PowerShell** hoặc **CMD** thứ nhất:

```powershell
cd C:\Project
npm start
```

Thấy dòng này là OK:
```
🌌 ═══════════════════════════════════════════════
   SPACE FILE TRANSFER SERVER
🌌 ═══════════════════════════════════════════════

🚀 Server running on: http://localhost:3000
☁️  Storage: Cloudinary (dcnjcuceg)
```

**⚠️ GIỮ NGUYÊN CỬA SỔ NÀY, ĐỪNG ĐÓNG!**

### 4.2. Start Ngrok (Terminal 2)

Mở **PowerShell** hoặc **CMD** thứ hai:

```powershell
cd C:\ngrok
.\ngrok http 3000
```

---

## 🌐 BƯỚC 5: Lấy URL Public

Ngrok sẽ hiển thị:

```
ngrok

Session Status                online
Account                       your@email.com (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       50ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc-123-xyz.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Copy URL này:** `https://abc-123-xyz.ngrok-free.app`

---

## 🎉 BƯỚC 6: Chia sẻ & Sử dụng

### Truy cập website:

- **Từ máy bạn**: `http://localhost:3000` hoặc URL ngrok
- **Từ bất kỳ đâu**: `https://abc-123-xyz.ngrok-free.app`

### Chia sẻ:

Gửi URL ngrok cho bạn bè, họ có thể:
- Upload file
- Download file
- Truy cập từ bất kỳ thiết bị nào (PC, phone, tablet)
- Từ bất kỳ đâu trên thế giới

---

## 🛑 BƯỚC 7: Dừng Server

Khi xong việc:

1. Nhấn **Ctrl+C** ở cửa sổ Ngrok
2. Nhấn **Ctrl+C** ở cửa sổ Server
3. Đóng cả 2 cửa sổ

Website sẽ offline, không tốn tài nguyên gì cả!

---

## 🚀 CÁCH NHANH - Dùng File BAT

### Tạo Shortcut tự động

File `start-server.bat` đã được tạo sẵn trong `C:\Project\`

**Cách dùng:**

1. **Double-click** `start-server.bat`
2. 2 cửa sổ CMD tự động mở:
   - Cửa sổ 1: Server
   - Cửa sổ 2: Ngrok
3. Copy URL từ cửa sổ Ngrok
4. Done!

### Tạo Desktop Shortcut:

1. Right-click `start-server.bat`
2. **Send to** → **Desktop (create shortcut)**
3. Đổi tên shortcut thành "🚀 Space Transfer"
4. Right-click shortcut → **Properties** → **Change Icon** (nếu muốn)

Giờ chỉ cần double-click icon trên Desktop! 🎯

---

## 📊 NGROK FREE TIER

### Giới hạn:

- ✅ Unlimited requests
- ✅ HTTPS miễn phí
- ✅ 1 online ngrok process
- ⚠️ URL thay đổi mỗi lần restart
- ⚠️ Có banner "ngrok" nhỏ ở đầu trang

### Nâng cấp (Optional):

**Ngrok Pro ($8/month):**
- ✅ Custom subdomain (fixed URL)
- ✅ Không có banner
- ✅ 3 online processes
- ✅ IP whitelisting

Link: https://ngrok.com/pricing

---

## 🔍 MONITORING

### Xem traffic realtime:

Khi Ngrok đang chạy, mở browser:
```
http://localhost:4040
```

Bạn sẽ thấy:
- Tất cả requests
- Response times
- Headers
- Request/Response body

Rất hữu ích để debug! 🐛

---

## 🐛 TROUBLESHOOTING

### Lỗi: "command not found"
**Nguyên nhân:** Chưa cd vào đúng thư mục
**Giải pháp:**
```powershell
cd C:\ngrok
.\ngrok http 3000
```

### Lỗi: "authtoken not found"
**Nguyên nhân:** Chưa setup authtoken
**Giải pháp:**
```powershell
cd C:\ngrok
.\ngrok config add-authtoken YOUR_TOKEN
```

### Lỗi: "port 3000 already in use"
**Nguyên nhân:** Server đã chạy rồi
**Giải pháp:**
```powershell
# Tìm process
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F
```

### Lỗi: "failed to start tunnel"
**Nguyên nhân:** Mất kết nối internet hoặc authtoken sai
**Giải pháp:**
- Check internet
- Verify authtoken tại: https://dashboard.ngrok.com/get-started/your-authtoken

### URL không truy cập được
**Nguyên nhân:** Server chưa chạy
**Giải pháp:**
- Đảm bảo `npm start` đang chạy
- Check terminal có lỗi không

---

## 💡 TIPS & TRICKS

### 1. Giữ URL cố định (Free)

Mỗi lần restart ngrok, URL thay đổi. Để share link dễ hơn:

**Tạo short link:**
- Dùng bit.ly, tinyurl.com
- Tạo QR code

### 2. Share nhanh

```powershell
# Copy URL tự động vào clipboard (PowerShell)
.\ngrok http 3000 | Select-String -Pattern "https://" | Set-Clipboard
```

### 3. Custom region

Nếu user chủ yếu ở châu Á:
```powershell
.\ngrok http 3000 --region ap
```

Regions:
- `us` - United States
- `eu` - Europe
- `ap` - Asia/Pacific
- `au` - Australia
- `sa` - South America
- `jp` - Japan
- `in` - India

### 4. Basic Auth (bảo mật)

Thêm password cho website:
```powershell
.\ngrok http 3000 --basic-auth "username:password"
```

---

## 📚 TÀI LIỆU THAM KHẢO

- **Ngrok Docs:** https://ngrok.com/docs
- **Dashboard:** https://dashboard.ngrok.com/
- **Status:** https://status.ngrok.com/

---

## 🎯 CHECKLIST

- [ ] Tải Ngrok về `C:\ngrok`
- [ ] Tạo tài khoản Ngrok
- [ ] Copy authtoken
- [ ] Chạy `ngrok config add-authtoken`
- [ ] Start server: `npm start`
- [ ] Start ngrok: `ngrok http 3000`
- [ ] Copy URL public
- [ ] Test truy cập
- [ ] Share với bạn bè

---

## 🎉 KẾT LUẬN

Với Ngrok, bạn có thể:
- ✅ Host website từ máy cá nhân
- ✅ Chia sẻ ra internet trong vài giây
- ✅ Không cần VPS, không cần config router
- ✅ Chạy khi nào cần, tắt khi xong
- ✅ HTTPS miễn phí
- ✅ Hoàn toàn FREE

**Perfect cho demo, testing, và personal use!** 🚀✨

---

**Made with 💜 by Yuu and Lt4c**
