// ============================================
// SPACE FILE TRANSFER - BACKEND SERVER
// Node.js + Express + Multer
// ============================================

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');

// ============================================
// CẤU HÌNH SERVER
// ============================================

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Cho phép CORS từ mọi nguồn
app.use(express.json()); // Parse JSON body
app.use(express.static('.')); // Serve static files (HTML, CSS, JS)

// Tạo thư mục uploads nếu chưa có
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log('✅ Created uploads directory');
}

// ============================================
// CẤU HÌNH MULTER (Upload File)
// ============================================

// Storage configuration - Lưu file với tên unique
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir); // Lưu vào thư mục uploads
    },
    filename: function (req, file, cb) {
        // Tạo tên file unique: timestamp + random + original name
        const uniqueSuffix = Date.now() + '-' + nanoid(10);
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        cb(null, uniqueSuffix + '-' + nameWithoutExt + ext);
    }
});

// File filter - Kiểm tra loại file (optional)
const fileFilter = (req, file, cb) => {
    // Chấp nhận mọi loại file
    // Nếu muốn giới hạn, thêm logic ở đây
    cb(null, true);
};

// Multer instance với cấu hình
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // Giới hạn 100MB
    }
});

// ============================================
// DATABASE (In-Memory) - Lưu metadata file
// ============================================

// Trong production, nên dùng MongoDB/PostgreSQL
// Đây là demo nên dùng object trong memory
const filesDatabase = {};

// ============================================
// API ENDPOINTS
// ============================================

// 📤 UPLOAD FILE
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Tạo mã file unique (6 ký tự)
        const fileCode = nanoid(6);

        // Lưu metadata vào database
        filesDatabase[fileCode] = {
            code: fileCode,
            originalName: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            uploadDate: new Date().toISOString(),
            downloadCount: 0
        };

        console.log(`✅ File uploaded: ${req.file.originalname} (Code: ${fileCode})`);

        // Trả về thông tin file
        res.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                code: fileCode,
                originalName: req.file.originalname,
                size: req.file.size,
                uploadDate: filesDatabase[fileCode].uploadDate
            }
        });

    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Upload failed',
            error: error.message
        });
    }
});

// 📥 GET FILE INFO (Kiểm tra file có tồn tại không)
app.get('/api/file/:code', (req, res) => {
    try {
        const { code } = req.params;

        // Tìm file trong database
        const fileInfo = filesDatabase[code];

        if (!fileInfo) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Kiểm tra file có tồn tại trên disk không
        const filePath = path.join(uploadsDir, fileInfo.filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }

        // Trả về thông tin file (không bao gồm filename thực)
        res.json({
            success: true,
            data: {
                code: fileInfo.code,
                originalName: fileInfo.originalName,
                size: fileInfo.size,
                mimetype: fileInfo.mimetype,
                uploadDate: fileInfo.uploadDate,
                downloadCount: fileInfo.downloadCount
            }
        });

    } catch (error) {
        console.error('❌ Get file info error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get file info',
            error: error.message
        });
    }
});

// 📥 DOWNLOAD FILE
app.get('/api/download/:code', (req, res) => {
    try {
        const { code } = req.params;

        // Tìm file trong database
        const fileInfo = filesDatabase[code];

        if (!fileInfo) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Đường dẫn file thực
        const filePath = path.join(uploadsDir, fileInfo.filename);

        // Kiểm tra file có tồn tại không
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }

        // Tăng download count
        fileInfo.downloadCount++;

        console.log(`📥 File downloaded: ${fileInfo.originalName} (Code: ${code})`);

        // Set headers và gửi file
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileInfo.originalName)}"`);
        res.setHeader('Content-Type', fileInfo.mimetype);
        
        // Stream file về client
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('❌ Download error:', error);
        res.status(500).json({
            success: false,
            message: 'Download failed',
            error: error.message
        });
    }
});

// 📊 GET ALL FILES (Admin - optional)
app.get('/api/files', (req, res) => {
    try {
        const allFiles = Object.values(filesDatabase).map(file => ({
            code: file.code,
            originalName: file.originalName,
            size: file.size,
            uploadDate: file.uploadDate,
            downloadCount: file.downloadCount
        }));

        res.json({
            success: true,
            count: allFiles.length,
            data: allFiles
        });

    } catch (error) {
        console.error('❌ Get files error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get files',
            error: error.message
        });
    }
});

// 🗑️ DELETE FILE (Optional)
app.delete('/api/file/:code', (req, res) => {
    try {
        const { code } = req.params;

        const fileInfo = filesDatabase[code];

        if (!fileInfo) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Xóa file khỏi disk
        const filePath = path.join(uploadsDir, fileInfo.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Xóa khỏi database
        delete filesDatabase[code];

        console.log(`🗑️ File deleted: ${fileInfo.originalName} (Code: ${code})`);

        res.json({
            success: true,
            message: 'File deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Delete failed',
            error: error.message
        });
    }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        uptime: process.uptime(),
        filesCount: Object.keys(filesDatabase).length
    });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    
    // Multer errors
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large (max 100MB)'
            });
        }
    }

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: err.message
    });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log('');
    console.log('🌌 ═══════════════════════════════════════════════');
    console.log('   SPACE FILE TRANSFER SERVER');
    console.log('🌌 ═══════════════════════════════════════════════');
    console.log('');
    console.log(`🚀 Server running on: http://localhost:${PORT}`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
    console.log(`💾 Files in database: ${Object.keys(filesDatabase).length}`);
    console.log('');
    console.log('📡 API Endpoints:');
    console.log(`   POST   /api/upload       - Upload file`);
    console.log(`   GET    /api/file/:code   - Get file info`);
    console.log(`   GET    /api/download/:code - Download file`);
    console.log(`   GET    /api/files        - List all files`);
    console.log(`   DELETE /api/file/:code   - Delete file`);
    console.log('');
    console.log('✨ Press Ctrl+C to stop');
    console.log('');
});
