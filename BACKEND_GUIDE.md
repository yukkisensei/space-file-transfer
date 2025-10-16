# 🚀 HƯỚNG DẪN BACKEND - SPACE FILE TRANSFER

## 📋 Mục lục
1. [Cài đặt](#cài-đặt)
2. [Chạy server](#chạy-server)
3. [API Endpoints](#api-endpoints)
4. [Giải thích code](#giải-thích-code)
5. [Deploy lên Internet](#deploy-lên-internet)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Cài đặt

### Bước 1: Cài Node.js
- Tải và cài Node.js từ: https://nodejs.org/
- Kiểm tra đã cài thành công:
```bash
node --version
npm --version
```

### Bước 2: Cài dependencies
Mở terminal trong thư mục `C:/Project` và chạy:

```bash
npm install
```

**Giải thích**: Lệnh này sẽ cài đặt tất cả packages trong `package.json`:
- `express`: Web framework để tạo server
- `multer`: Xử lý upload file
- `cors`: Cho phép frontend gọi API từ domain khác
- `nanoid`: Tạo ID ngẫu nhiên cho file
- `nodemon`: Auto-restart server khi code thay đổi (dev only)

---

## 🚀 Chạy Server

### Development Mode (Tự động restart khi code thay đổi)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Server sẽ chạy tại: **http://localhost:3000**

---

## 📡 API Endpoints

### 1. Upload File
**POST** `/api/upload`

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: FormData với field `file`

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "code": "abc123",
    "originalName": "document.pdf",
    "size": 1024000,
    "uploadDate": "2024-01-01T00:00:00.000Z"
  }
}
```

**Ví dụ với JavaScript:**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:3000/api/upload', {
    method: 'POST',
    body: formData
});

const result = await response.json();
console.log(result.data.code); // Mã file để download
```

---

### 2. Get File Info
**GET** `/api/file/:code`

**Request:**
- Method: GET
- URL: `/api/file/abc123`

**Response:**
```json
{
  "success": true,
  "data": {
    "code": "abc123",
    "originalName": "document.pdf",
    "size": 1024000,
    "mimetype": "application/pdf",
    "uploadDate": "2024-01-01T00:00:00.000Z",
    "downloadCount": 5
  }
}
```

**Ví dụ:**
```javascript
const response = await fetch('http://localhost:3000/api/file/abc123');
const result = await response.json();
console.log(result.data.originalName);
```

---

### 3. Download File
**GET** `/api/download/:code`

**Request:**
- Method: GET
- URL: `/api/download/abc123`

**Response:**
- File stream (binary data)
- Headers: Content-Disposition, Content-Type

**Ví dụ:**
```javascript
// Tạo link download
const downloadUrl = 'http://localhost:3000/api/download/abc123';
const a = document.createElement('a');
a.href = downloadUrl;
a.download = 'filename.pdf';
a.click();
```

---

### 4. List All Files (Admin)
**GET** `/api/files`

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "code": "abc123",
      "originalName": "document.pdf",
      "size": 1024000,
      "uploadDate": "2024-01-01T00:00:00.000Z",
      "downloadCount": 5
    }
  ]
}
```

---

### 5. Delete File
**DELETE** `/api/file/:code`

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

### 6. Health Check
**GET** `/api/health`

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "uptime": 3600,
  "filesCount": 10
}
```

---

## 🧠 Giải thích Code

### 1. Express Server Setup
```javascript
const express = require('express');
const app = express();
```
- Tạo Express app để xử lý HTTP requests

### 2. Middleware
```javascript
app.use(cors());
app.use(express.json());
app.use(express.static('.'));
```
- `cors()`: Cho phép frontend gọi API
- `express.json()`: Parse JSON trong request body
- `express.static('.')`: Serve HTML/CSS/JS files

### 3. Multer Configuration
```javascript
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + nanoid(10);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
```
- `destination`: Thư mục lưu file (uploads/)
- `filename`: Tên file unique để tránh trùng lặp

### 4. File Database (In-Memory)
```javascript
const filesDatabase = {};
```
- Lưu metadata file trong RAM
- **Lưu ý**: Dữ liệu mất khi restart server
- **Production**: Nên dùng MongoDB hoặc PostgreSQL

### 5. Upload Handler
```javascript
app.post('/api/upload', upload.single('file'), (req, res) => {
    const fileCode = nanoid(6);
    filesDatabase[fileCode] = {
        code: fileCode,
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        // ...
    };
});
```
- `upload.single('file')`: Middleware xử lý 1 file
- `nanoid(6)`: Tạo mã 6 ký tự ngẫu nhiên
- Lưu metadata vào database

### 6. Download Handler
```javascript
app.get('/api/download/:code', (req, res) => {
    const filePath = path.join(uploadsDir, fileInfo.filename);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
});
```
- Stream file về client (hiệu quả cho file lớn)
- Set headers để browser download file

---

## 🌐 Deploy lên Internet

### Option 1: Railway (Recommend) ⭐

1. **Tạo tài khoản**: https://railway.app/
2. **Cài Railway CLI**:
```bash
npm install -g @railway/cli
```

3. **Login**:
```bash
railway login
```

4. **Deploy**:
```bash
railway init
railway up
```

5. **Lấy URL**: Railway sẽ cung cấp URL public

**Ưu điểm**:
- ✅ Free tier (500 hours/month)
- ✅ Tự động deploy khi push code
- ✅ Hỗ trợ file storage
- ✅ Easy setup

---

### Option 2: Render

1. **Tạo tài khoản**: https://render.com/
2. **New Web Service**
3. **Connect GitHub repo**
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`

**Ưu điểm**:
- ✅ Free tier
- ✅ Auto deploy từ GitHub
- ✅ SSL miễn phí

**Lưu ý**: File sẽ mất khi restart (dùng cloud storage)

---

### Option 3: Vercel (Frontend) + Railway (Backend)

**Frontend (Vercel)**:
1. Deploy HTML/CSS/JS lên Vercel
2. Free, nhanh, CDN global

**Backend (Railway)**:
1. Deploy Node.js server lên Railway
2. Update API_URL trong script.js

---

### Option 4: VPS (Full Control)

**Providers**: DigitalOcean, Linode, Vultr

**Setup**:
```bash
# SSH vào VPS
ssh root@your-ip

# Cài Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone code
git clone your-repo
cd your-repo

# Cài dependencies
npm install

# Chạy với PM2 (process manager)
npm install -g pm2
pm2 start server.js
pm2 save
pm2 startup
```

---

## 🔐 Bảo mật (Production)

### 1. Rate Limiting
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 2. File Type Validation
```javascript
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type'), false);
    }
};
```

### 3. Virus Scanning
```bash
npm install clamscan
```

---

## 📊 Nâng cấp với Database

### MongoDB
```bash
npm install mongoose
```

```javascript
const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    code: String,
    originalName: String,
    filename: String,
    size: Number,
    uploadDate: Date,
    downloadCount: Number
});

const File = mongoose.model('File', FileSchema);

// Lưu file
const newFile = new File({
    code: fileCode,
    originalName: req.file.originalname,
    // ...
});
await newFile.save();

// Tìm file
const file = await File.findOne({ code: fileCode });
```

---

## 🐛 Troubleshooting

### Lỗi: "Cannot find module 'express'"
**Giải pháp**: Chạy `npm install`

### Lỗi: "Port 3000 already in use"
**Giải pháp**: 
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill
```

### Lỗi: "CORS policy"
**Giải pháp**: Đã có `app.use(cors())` trong code

### File không upload được
**Kiểm tra**:
1. Thư mục `uploads/` có tồn tại không?
2. File size có vượt quá 100MB không?
3. Check console log trong server

### File mất sau khi restart
**Nguyên nhân**: Dùng in-memory database
**Giải pháp**: Dùng MongoDB hoặc PostgreSQL

---

## 📚 Học thêm

### Express.js
- Docs: https://expressjs.com/
- Tutorial: https://www.youtube.com/watch?v=L72fhGm1tfE

### Multer
- Docs: https://github.com/expressjs/multer
- Guide: https://www.npmjs.com/package/multer

### Node.js
- Docs: https://nodejs.org/docs/
- Tutorial: https://www.youtube.com/watch?v=TlB_eWDSMt4

---

## 🎯 Next Steps

1. ✅ Chạy server local
2. ✅ Test upload/download
3. ⬜ Thêm database (MongoDB)
4. ⬜ Deploy lên Railway/Render
5. ⬜ Thêm authentication
6. ⬜ Thêm file expiration
7. ⬜ Thêm analytics

---

**Made with 💜 by Space File Transfer Team**
