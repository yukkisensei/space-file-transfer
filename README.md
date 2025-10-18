# 🚀 YuFile - Space File Transfer

**Beautiful space-themed file transfer system with admin approval flow**

---

## 📋 Mục Lục

1. [Tính năng](#-tính-năng)
2. [Yêu cầu](#-yêu-cầu)
3. [Cài đặt nhanh](#-cài-đặt-nhanh)
4. [Cấu hình](#-cấu-hình)
5. [Deploy lên Railway](#-deploy-lên-railway)
6. [Admin System](#-admin-system)
7. [API Endpoints](#-api-endpoints)
8. [Bảo mật](#-bảo-mật)

---

## ✨ Tính Năng

### 🎯 Core Features
- ✅ Upload/Download files với authentication
- ✅ Auto-delete dựa trên file size (30h - 1h)
- ✅ User profile với avatar & display name
- ✅ Direct download links (wget/curl support)
- ✅ Beautiful space-themed UI với liquid glass effects

### 👑 Admin System
- ✅ **Owner**: Full access, approve admin logins
- ✅ **Admin**: Requires owner approval to login
- ✅ **IP Blocking**: Auto-ban on denied login
- ✅ **Notifications**: Real-time alerts for owner
- ✅ **Console**: View users, files, blocked IPs

### 🔐 Security
- ✅ Admin login approval flow
- ✅ IP tracking & blocking
- ✅ Login attempts tracking (5 attempts → lock)
- ✅ Permanent IP ban on deny
- ✅ Environment-based credentials

### 💾 Storage
- ✅ Cloudinary (24GB free tier)
- ✅ Auto-delete inactive users (30 days)
- ✅ Storage monitoring & alerts

---

## 📦 Yêu Cầu

- Node.js 14+
- Cloudinary account (free tier)
- Git

---

## ⚡ Cài Đặt Nhanh

### 1. Clone & Install
```bash
git clone https://github.com/yukkisensei/space-file-transfer.git
cd space-file-transfer
npm install
```

### 2. Tạo file `.env`
```env
# Cloudinary (24GB Free)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Owner Account (Full Access)
OWNER_USERNAME=your_owner_username
OWNER_PASSWORD=your_secure_password

# Admin Accounts (Require Owner Approval)
ADMIN1_USERNAME=your_admin1_username
ADMIN1_PASSWORD=your_admin1_password

ADMIN2_USERNAME=your_admin2_username
ADMIN2_PASSWORD=your_admin2_password

ADMIN3_USERNAME=your_admin3_username
ADMIN3_PASSWORD=your_admin3_password

# Port (optional)
PORT=3000
```

### 3. Chạy server
```bash
npm start
```

Mở: http://localhost:3000

---

## 🔧 Cấu Hình

### Cloudinary Setup

1. Đăng ký tại: https://cloudinary.com
2. Vào Dashboard → Copy:
   - Cloud Name
   - API Key
   - API Secret
3. Paste vào file `.env`

### Admin Accounts

**Owner (Full Access):**
- Login trực tiếp vào admin console
- Approve/deny admin login requests
- View tất cả users (including admins)
- View notifications

**Admin (Requires Approval):**
- Phải được owner approve mới login được
- Chỉ view regular users
- Không thấy notifications
- IP bị ban vĩnh viễn nếu owner deny

### File Auto-Delete

Dựa trên file size:
- **< 100MB**: 30 giờ
- **< 1GB**: 24 giờ
- **< 5GB**: 12 giờ
- **≥ 5GB**: 1 giờ

### User Auto-Delete

Users không hoạt động trong 30 ngày sẽ bị xóa tự động (kèm theo tất cả files của họ).

---

## 🚂 Deploy Lên Railway

### Bước 1: Tạo Project

1. Vào https://railway.app
2. Click **"New Project"**
3. Chọn **"Deploy from GitHub repo"**
4. Chọn repo: `yukkisensei/space-file-transfer`

### Bước 2: Thêm Environment Variables

Click tab **"Variables"** và thêm:

```
CLOUDINARY_CLOUD_NAME = your_cloud_name
CLOUDINARY_API_KEY = your_api_key
CLOUDINARY_API_SECRET = your_api_secret

OWNER_USERNAME = your_owner_username
OWNER_PASSWORD = your_secure_password

ADMIN1_USERNAME = your_admin1_username
ADMIN1_PASSWORD = your_admin1_password

ADMIN2_USERNAME = your_admin2_username
ADMIN2_PASSWORD = your_admin2_password

ADMIN3_USERNAME = your_admin3_username
ADMIN3_PASSWORD = your_admin3_password
```

**Lưu ý:**
- Mỗi variable là 1 dòng riêng
- KHÔNG cần dấu ngoặc kép
- Railway tự động redeploy khi thêm variables

### Bước 3: Deploy

Railway tự động deploy! Chờ vài phút và app sẽ live.

### Bước 4: Verify

1. Click **"View Logs"** để xem deployment
2. Kiểm tra có lỗi không
3. Click domain để mở app

### Railway CLI (Optional)

```bash
# Install
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Thêm variables nhanh
railway variables set OWNER_USERNAME="your_username"
railway variables set OWNER_PASSWORD="your_password"
# ... (thêm các biến còn lại)
```

---

## 👑 Admin System

### Admin Login Flow

#### Owner Login:
1. Vào `/admin-login.html`
2. Nhập username/password
3. ✅ Login trực tiếp → `/admin-console.html`

#### Admin Login:
1. Vào `/admin-login.html`
2. Nhập username/password
3. ⏳ Tạo login request
4. 📧 Owner nhận notification
5. Redirect → `/admin-login-wait.html`
6. Poll API mỗi 3 giây
7. **Owner approve** → ✅ Login thành công
8. **Owner deny** → ❌ IP bị ban vĩnh viễn

### Admin Console Features

**Owner Only:**
- ✅ View tất cả users (admins + regular users)
- ✅ View notifications
- ✅ Approve/deny admin login requests
- ✅ View pending admin logins

**All Admins:**
- ✅ View regular users
- ✅ View files statistics
- ✅ View blocked IPs
- ✅ View storage status

### Testing Admin Login

```bash
# Test Owner login
curl -X POST http://localhost:3000/api/admin/console/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_owner_username","password":"your_owner_password"}'

# Test Admin login
curl -X POST http://localhost:3000/api/admin/console/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_admin1_username","password":"your_admin1_password"}'
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/user/profile/update` - Update profile
- `GET /api/user/profile/:username` - Get profile

### File Management
- `POST /api/upload` - Upload file (requires auth)
- `GET /api/file/:code` - Get file info
- `GET /api/download/:code` - Download file (requires auth)
- `GET /api/direct-link/:code` - Get wget/curl commands
- `DELETE /api/file/:code` - Delete file (owner only)
- `GET /api/user/:username/files` - Get user's files

### Admin Console
- `POST /api/admin/console/login` - Admin login
- `GET /api/admin/console/users` - Get all users (admin only)
- `GET /api/admin/console/notifications` - Get notifications (owner only)
- `GET /api/admin/console/blocked-ips` - Get blocked IPs (admin only)
- `GET /api/admin/pending-logins` - Get pending logins (owner only)
- `POST /api/admin/approve-login` - Approve admin login (owner only)
- `POST /api/admin/deny-login` - Deny & ban IP (owner only)
- `GET /api/admin/login-status/:requestId` - Check login status

### Storage
- `GET /api/storage/status` - Get storage status
- `GET /api/health` - Health check

---

## 🔐 Bảo Mật

### Environment Variables

**✅ LUÔN LUÔN:**
- Lưu credentials trong `.env`
- Thêm `.env` vào `.gitignore`
- KHÔNG commit `.env` lên Git
- Đổi tất cả passwords mặc định

**❌ KHÔNG BAO GIỜ:**
- Hardcode passwords trong code
- Commit API keys lên GitHub
- Share file `.env` với người khác
- Dùng passwords yếu

### Admin Security

- ✅ Admin login requires owner approval
- ✅ IP tracking cho mọi login attempts
- ✅ Permanent IP ban on denied login
- ✅ Login attempts tracking (5 attempts → lock)
- ✅ Lock duration tăng theo cấp số nhân (10, 20, 40, 80 phút...)

### File Security

- ✅ User authentication required for upload/download
- ✅ File ownership verification
- ✅ Auto-delete based on file size
- ✅ Storage quota monitoring
- ✅ Cloudinary secure URLs

---

## 🛠️ Development

### Local Development
```bash
npm run dev  # Với nodemon
```

### Project Structure
```
space-file-transfer/
├── server.js              # Main server
├── auth-system.js         # Authentication & authorization
├── storage-config.js      # Cloudinary configuration
├── index.html             # Main website
├── admin-login.html       # Admin login page
├── admin-login-wait.html  # Waiting for approval
├── admin-console.html     # Admin console
├── script.js              # Frontend logic
├── styles.css             # Styling
├── package.json           # Dependencies
├── .env                   # Environment variables (DO NOT COMMIT)
├── .env.example           # Template
└── .gitignore             # Git ignore
```

### Dependencies
```json
{
  "cloudinary": "^1.41.0",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "express": "^4.18.2",
  "multer": "^1.4.5-lts.1",
  "multer-storage-cloudinary": "^4.0.0",
  "nanoid": "^3.3.7"
}
```

---

## 📝 Notes

### Cloudinary Limits
- Free tier: 24GB storage
- Upload limit: 10GB per file
- Auto-alert when > 80% full
- Upload blocked when > 95% full

### User Management
- Regular users: Stored in Cloudinary
- Admin accounts: Environment variables
- Inactive users deleted after 30 days
- Files deleted with user

### Notifications
- Admin login requests
- IP blocking events
- Storage warnings
- Kept last 100 notifications

---

## 🐛 Troubleshooting

### Server không start
- Kiểm tra file `.env` có đúng format không
- Verify Cloudinary credentials
- Check port 3000 có bị chiếm không

### Upload failed
- Kiểm tra Cloudinary quota
- Verify user authentication
- Check file size < 10GB

### Admin login không hoạt động
- Verify credentials trong `.env`
- Check owner có approve không
- Kiểm tra IP có bị block không

### Railway deployment failed
- Verify tất cả environment variables đã thêm
- Check logs: `railway logs`
- Ensure Cloudinary credentials đúng

---

## 📞 Support

- GitHub: https://github.com/yukkisensei/space-file-transfer
- Issues: https://github.com/yukkisensei/space-file-transfer/issues

---

## 📄 License

MIT License - Original by fovos032

---

**🚀 Ready to deploy!**
