// ============================================
// SPACE FILE TRANSFER - BACKEND SERVER
// Node.js + Express + Multer + Cloudinary
// ============================================

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const authSystem = require('./auth-system');

// ============================================
// CẤU HÌNH SERVER
// ============================================

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Cho phép CORS từ mọi nguồn
app.use(express.json({ limit: '50mb' })); // Parse JSON body with increased limit
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Parse URL-encoded body
app.use(express.static('.')); // Serve static files (HTML, CSS, JS)

// ============================================
// CẤU HÌNH CLOUDINARY
// ============================================

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('✅ Cloudinary configured:', process.env.CLOUDINARY_CLOUD_NAME);

// ============================================
// CẤU HÌNH MULTER (Upload File) - CLOUDINARY
// ============================================

// Cloudinary storage configuration
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Lấy extension từ filename
        const ext = path.extname(file.originalname) || '.bin';
        const nameWithoutExt = path.basename(file.originalname, ext);
        const uniqueSuffix = Date.now() + '-' + nanoid(10);
        
        return {
            folder: 'space-file-transfer',
            resource_type: 'auto', // Để Cloudinary tự detect
            public_id: `${uniqueSuffix}-${nameWithoutExt}`,
            use_filename: false,
            unique_filename: true,
            chunk_size: 6000000, // 6MB chunks for large files
            timeout: 600000 // 10 minutes timeout
        };
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
        fileSize: 10 * 1024 * 1024 * 1024 // Giới hạn 10GB
    }
});

// ============================================
// DATABASE (In-Memory) - Lưu metadata file
// ============================================

// Trong production, nên dùng MongoDB/PostgreSQL
// Đây là demo nên dùng object trong memory
const filesDatabase = {};
let usersDatabase = {};

// Initialize predefined admins
const predefinedAdmins = authSystem.getPredefinedAdmins();
console.log('✅ Predefined admins loaded:', Object.keys(predefinedAdmins).length);

// Users data file on Cloudinary
const USERS_FILE_PUBLIC_ID = 'space-file-transfer/users-database';
const FILES_DB_PUBLIC_ID = 'space-file-transfer/files-database';

// Upload lock status
let uploadLocked = false;
let uploadLockReason = '';

// Load files database from Cloudinary
async function loadFilesFromCloudinary() {
    try {
        const result = await cloudinary.api.resource(FILES_DB_PUBLIC_ID, { resource_type: 'raw' });
        const response = await fetch(result.secure_url);
        const data = await response.json();
        Object.assign(filesDatabase, data || {});
        console.log(`✅ Loaded ${Object.keys(filesDatabase).length} files from Cloudinary`);
    } catch (error) {
        console.log('ℹ️  No files database found, starting fresh');
    }
}

// Save files database to Cloudinary
async function saveFilesToCloudinary() {
    try {
        const filesJson = JSON.stringify(filesDatabase, null, 2);
        const buffer = Buffer.from(filesJson, 'utf-8');
        
        await cloudinary.uploader.upload_stream(
            {
                resource_type: 'raw',
                public_id: FILES_DB_PUBLIC_ID,
                overwrite: true
            },
            (error, result) => {
                if (error) {
                    console.error('❌ Error saving files database:', error);
                } else {
                    console.log('✅ Files database saved to Cloudinary');
                }
            }
        ).end(buffer);
    } catch (error) {
        console.error('❌ Error saving files database:', error);
    }
}

// Load users from Cloudinary
async function loadUsersFromCloudinary() {
    try {
        const result = await cloudinary.api.resource(USERS_FILE_PUBLIC_ID, { resource_type: 'raw' });
        const response = await fetch(result.secure_url);
        const data = await response.json();
        usersDatabase = data || {};
        console.log(`✅ Loaded ${Object.keys(usersDatabase).length} users from Cloudinary`);
    } catch (error) {
        // File not found or any error - just start fresh
        console.log('ℹ️  No users file found or error loading, starting fresh');
        usersDatabase = {};
    }
}

// Save users to Cloudinary
async function saveUsersToCloudinary() {
    try {
        const usersJson = JSON.stringify(usersDatabase, null, 2);
        const buffer = Buffer.from(usersJson, 'utf-8');
        
        await cloudinary.uploader.upload_stream(
            {
                resource_type: 'raw',
                public_id: USERS_FILE_PUBLIC_ID,
                overwrite: true
            },
            (error, result) => {
                if (error) {
                    console.error('❌ Error saving users:', error);
                } else {
                    console.log('✅ Users saved to Cloudinary');
                }
            }
        ).end(buffer);
    } catch (error) {
        console.error('❌ Error saving users to Cloudinary:', error);
    }
}

// Auto-delete files based on size
// < 100MB = 30 hours
// < 1GB = 24 hours  
// < 5GB = 12 hours
// >= 5GB = 1 hour

function getExpiryTime(fileSize) {
    const MB = 1024 * 1024;
    const GB = 1024 * MB;
    
    if (fileSize < 100 * MB) {
        return 30 * 60 * 60 * 1000; // 30 hours
    } else if (fileSize < 1 * GB) {
        return 24 * 60 * 60 * 1000; // 24 hours
    } else if (fileSize < 5 * GB) {
        return 12 * 60 * 60 * 1000; // 12 hours
    } else {
        return 1 * 60 * 60 * 1000; // 1 hour
    }
}

function getExpiryTimeText(fileSize) {
    const MB = 1024 * 1024;
    const GB = 1024 * MB;
    
    if (fileSize < 100 * MB) {
        return '30 giờ';
    } else if (fileSize < 1 * GB) {
        return '24 giờ';
    } else if (fileSize < 5 * GB) {
        return '12 giờ';
    } else {
        return '1 giờ';
    }
}

function scheduleFileDeletion(fileCode, fileSize) {
    const expiryTime = getExpiryTime(fileSize);
    
    setTimeout(async () => {
        const fileInfo = filesDatabase[fileCode];
        if (fileInfo) {
            try {
                // Delete from Cloudinary
                const publicId = fileInfo.cloudinaryPublicId;
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                    console.log(`🗑️ Auto-deleted from Cloudinary: ${fileInfo.originalName} (Code: ${fileCode})`);
                }
                
                // Delete from database
                delete filesDatabase[fileCode];
                await saveFilesToCloudinary();
                console.log(`🗑️ Auto-deleted from database: ${fileInfo.originalName} (Code: ${fileCode})`);
                
                // Check if we can unlock upload after deletion
                await checkAndUnlockUpload();
            } catch (error) {
                console.error('❌ Auto-delete error:', error);
            }
        }
    }, expiryTime);
}

async function checkExpiredFiles() {
    const now = Date.now();
    let deletedAny = false;
    
    for (const fileCode of Object.keys(filesDatabase)) {
        const fileInfo = filesDatabase[fileCode];
        const uploadTime = new Date(fileInfo.uploadDate).getTime();
        const timeDiff = now - uploadTime;
        const expiryTime = getExpiryTime(fileInfo.size);
        
        if (timeDiff >= expiryTime) {
            try {
                // Delete from Cloudinary
                const publicId = fileInfo.cloudinaryPublicId;
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                }
                
                // Delete from database
                delete filesDatabase[fileCode];
                await saveFilesToCloudinary();
                console.log(`🗑️ Expired file deleted: ${fileInfo.originalName} (Code: ${fileCode})`);
                deletedAny = true;
            } catch (error) {
                console.error('❌ Expired file deletion error:', error);
            }
        }
    }
    
    // Check if we can unlock upload after deletions
    if (deletedAny) {
        await checkAndUnlockUpload();
    }
}

// Check if we can unlock upload after file deletion
async function checkAndUnlockUpload() {
    if (!uploadLocked) return;
    
    try {
        const storageConfig = require('./storage-config');
        const status = await storageConfig.getStorageStatus();
        
        // Unlock if storage drops below 90%
        if (status.total.percent < 90) {
            uploadLocked = false;
            uploadLockReason = '';
            console.log('✅ Upload unlocked! Storage: ' + status.total.percent.toFixed(1) + '%');
            
            // Send notification
            await storageConfig.sendAdminNotification({
                type: 'info',
                message: `✅ Upload đã được mở khóa! Storage hiện tại: ${status.total.percent.toFixed(1)}%`,
                usage: status.total
            });
        }
    } catch (error) {
        console.error('❌ Error checking unlock status:', error);
    }
}

// Check for expired files every hour
setInterval(checkExpiredFiles, 60 * 60 * 1000);

// Auto-delete inactive users after 30 days
const USER_INACTIVE_TIME = 30 * 24 * 60 * 60 * 1000; // 30 days

function checkInactiveUsers() {
    const now = Date.now();
    let deletedCount = 0;
    
    Object.keys(usersDatabase).forEach(username => {
        const user = usersDatabase[username];
        const createdTime = new Date(user.createdAt).getTime();
        const lastActivityTime = user.lastActivity ? new Date(user.lastActivity).getTime() : createdTime;
        const timeDiff = now - lastActivityTime;
        
        // Delete if inactive for 30 days
        if (timeDiff >= USER_INACTIVE_TIME) {
            // Delete all user's files first
            if (user.uploadedFiles && user.uploadedFiles.length > 0) {
                user.uploadedFiles.forEach(async (fileCode) => {
                    const fileInfo = filesDatabase[fileCode];
                    if (fileInfo) {
                        try {
                            // Delete from Cloudinary
                            if (fileInfo.cloudinaryPublicId) {
                                await cloudinary.uploader.destroy(fileInfo.cloudinaryPublicId);
                            }
                            delete filesDatabase[fileCode];
                            await saveFilesToCloudinary();
                        } catch (error) {
                            console.error('❌ Error deleting user file:', error);
                        }
                    }
                });
            }
            
            // Delete user
            delete usersDatabase[username];
            deletedCount++;
            console.log(`🗑️ Inactive user deleted: ${username} (inactive for ${Math.floor(timeDiff / (24 * 60 * 60 * 1000))} days)`);
        }
    });
    
    if (deletedCount > 0) {
        saveUsersToCloudinary();
    }
}

// Check for inactive users every day
setInterval(checkInactiveUsers, 24 * 60 * 60 * 1000);

// ============================================
// API ENDPOINTS
// ============================================

// 📤 UPLOAD FILE
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        console.log('📤 Upload request received');
        console.log('Body:', req.body);
        console.log('File:', req.file ? 'Yes' : 'No');
        
        if (!req.file) {
            console.log('❌ No file in request');
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Get username from request body
        const { username } = req.body;
        console.log('Username from body:', username);
        console.log('Users in DB:', Object.keys(usersDatabase));
        
        // Check if user exists in either usersDatabase or predefinedAdmins
        const isAdmin = authSystem.isAdmin(username);
        const userExists = usersDatabase[username] || isAdmin;
        
        if (!username || !userExists) {
            console.log('❌ User not authenticated:', username);
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        // Check if upload is locked
        if (uploadLocked) {
            console.log('🔒 Upload is locked:', uploadLockReason);
            
            // Delete the already uploaded file from Cloudinary
            if (req.file.filename) {
                try {
                    await cloudinary.uploader.destroy(req.file.filename);
                    console.log('🗑️ Cleaned up uploaded file due to upload lock');
                } catch (deleteError) {
                    console.error('Failed to cleanup file:', deleteError);
                }
            }
            
            return res.status(503).json({
                success: false,
                message: uploadLockReason || 'Upload is temporarily locked due to storage limit. Please wait for files to expire.',
                error: 'UPLOAD_LOCKED',
                uploadLocked: true
            });
        }

        // Check storage before processing upload
        const storageConfig = require('./storage-config');
        try {
            await storageConfig.checkStorageBeforeUpload(req.file.size);
        } catch (storageError) {
            console.log('❌ Storage check failed:', storageError.message);
            
            // Delete the already uploaded file from Cloudinary
            if (req.file.filename) {
                try {
                    await cloudinary.uploader.destroy(req.file.filename);
                    console.log('🗑️ Cleaned up uploaded file due to storage error');
                } catch (deleteError) {
                    console.error('Failed to cleanup file:', deleteError);
                }
            }
            
            if (storageError.message === 'STORAGE_FULL') {
                // Lock upload
                uploadLocked = true;
                uploadLockReason = '🔒 Storage đã đầy (≥95%)! Upload bị khóa cho đến khi có file hết hạn và giải phóng dung lượng.';
                console.log('🔒 Upload locked due to storage full');
                
                return res.status(507).json({
                    success: false,
                    message: uploadLockReason,
                    error: 'STORAGE_FULL',
                    storageFull: true,
                    uploadLocked: true
                });
            }
            
            return res.status(507).json({
                success: false,
                message: storageError.message || 'Storage limit exceeded',
                error: 'STORAGE_ERROR'
            });
        }

        // Tạo mã file unique (6 ký tự)
        const fileCode = nanoid(6);

        // Extract public_id from Cloudinary response
        const cloudinaryPublicId = req.file.filename; // Cloudinary public_id

        // Calculate expiry time based on file size
        const expiryTime = getExpiryTime(req.file.size);
        const expiryTimeText = getExpiryTimeText(req.file.size);

        // Lưu metadata vào database
        filesDatabase[fileCode] = {
            code: fileCode,
            originalName: req.file.originalname,
            filename: req.file.filename,
            cloudinaryUrl: req.file.path, // Cloudinary URL
            cloudinaryPublicId: cloudinaryPublicId,
            size: req.file.size,
            mimetype: req.file.mimetype,
            uploadDate: new Date().toISOString(),
            expiryDate: new Date(Date.now() + expiryTime).toISOString(),
            expiryTimeText: expiryTimeText,
            uploadedBy: username,
            viewCount: 0,
            downloadCount: 0
        };

        // Add to user's uploaded files and update last activity (only for regular users)
        if (usersDatabase[username]) {
            if (!usersDatabase[username].uploadedFiles) {
                usersDatabase[username].uploadedFiles = [];
            }
            usersDatabase[username].uploadedFiles.push(fileCode);
            usersDatabase[username].lastActivity = new Date().toISOString();
            await saveUsersToCloudinary();
        }

        // Save files database to Cloudinary
        await saveFilesToCloudinary();

        // Schedule auto-deletion based on file size
        scheduleFileDeletion(fileCode, req.file.size);

        console.log(`✅ File uploaded: ${req.file.originalname} (Code: ${fileCode}) by ${username}`);

        // Trả về thông tin file
        res.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                code: fileCode,
                originalName: req.file.originalname,
                size: req.file.size,
                uploadDate: filesDatabase[fileCode].uploadDate,
                expiryDate: filesDatabase[fileCode].expiryDate,
                expiryTimeText: filesDatabase[fileCode].expiryTimeText
            }
        });

    } catch (error) {
        console.error('❌ Upload error:', error);
        
        // Check if storage is full
        if (error.message === 'STORAGE_FULL') {
            return res.status(507).json({
                success: false,
                message: 'Storage is full! Upload has been blocked.',
                error: 'STORAGE_FULL',
                storageFull: true
            });
        }
        
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

        // File lưu trên Cloudinary, không cần kiểm tra disk

        // Check if file is expired
        const uploadTime = new Date(fileInfo.uploadDate).getTime();
        const now = Date.now();
        const expiryTime = getExpiryTime(fileInfo.size);
        
        if (now - uploadTime >= expiryTime) {
            // File expired, delete it
            delete filesDatabase[code];
            return res.status(404).json({
                success: false,
                message: 'File has expired and been deleted'
            });
        }

        // Increment view count
        fileInfo.viewCount = (fileInfo.viewCount || 0) + 1;

        // Trả về thông tin file (không bao gồm filename thực)
        res.json({
            success: true,
            data: {
                code: fileInfo.code,
                originalName: fileInfo.originalName,
                size: fileInfo.size,
                mimetype: fileInfo.mimetype,
                uploadDate: fileInfo.uploadDate,
                expiryDate: fileInfo.expiryDate,
                expiryTimeText: fileInfo.expiryTimeText,
                viewCount: fileInfo.viewCount,
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

        // Tăng download count
        fileInfo.downloadCount++;

        console.log(`📥 File downloaded: ${fileInfo.originalName} (Code: ${code})`);

        // Redirect to Cloudinary URL (file sẽ download trực tiếp từ Cloudinary)
        res.redirect(fileInfo.cloudinaryUrl);

    } catch (error) {
        console.error('❌ Download error:', error);
        res.status(500).json({
            success: false,
            message: 'Download failed',
            error: error.message
        });
    }
});

// 📥 GET DIRECT DOWNLOAD LINK (for wget/curl)
app.get('/api/direct-link/:code', (req, res) => {
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

        // Return direct Cloudinary URL
        res.json({
            success: true,
            data: {
                directUrl: fileInfo.cloudinaryUrl,
                filename: fileInfo.originalName,
                wgetCommand: `wget -O "${fileInfo.originalName}" "${fileInfo.cloudinaryUrl}"`,
                curlCommand: `curl -o "${fileInfo.originalName}" "${fileInfo.cloudinaryUrl}"`
            }
        });

    } catch (error) {
        console.error('❌ Get direct link error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get direct link',
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

// 💾 GET STORAGE STATUS
app.get('/api/storage/status', async (req, res) => {
    try {
        const storageConfig = require('./storage-config');
        const status = await storageConfig.getStorageStatus();
        
        // Add total files count from database
        status.totalFiles = Object.keys(filesDatabase).length;
        
        // Add upload lock status
        status.uploadLocked = uploadLocked;
        status.uploadLockReason = uploadLockReason;

        res.json({
            success: true,
            data: status
        });

    } catch (error) {
        console.error('❌ Get storage status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get storage status',
            error: error.message
        });
    }
});

// 👤 AUTHENTICATION ENDPOINTS

// Get user's uploaded files
app.get('/api/user/:username/files', (req, res) => {
    try {
        const { username } = req.params;
        
        if (!usersDatabase[username]) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userFiles = (usersDatabase[username].uploadedFiles || [])
            .map(fileCode => filesDatabase[fileCode])
            .filter(file => file !== undefined); // Filter out deleted files

        res.json({
            success: true,
            data: userFiles
        });

    } catch (error) {
        console.error('❌ Get user files error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user files',
            error: error.message
        });
    }
});

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        if (usersDatabase[username]) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists'
            });
        }

        // Save user (in production, hash password)
        usersDatabase[username] = {
            username: username,
            password: password,
            displayName: username, // Default display name
            avatar: null, // No avatar by default
            createdAt: new Date().toISOString(),
            uploadedFiles: [] // Track user's uploaded files
        };

        // Save to Cloudinary
        await saveUsersToCloudinary();

        console.log(`✅ User registered: ${username}`);

        res.json({
            success: true,
            message: 'User registered successfully'
        });

    } catch (error) {
        console.error('❌ Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Signup failed',
            error: error.message
        });
    }
});

// Sign In
app.post('/api/auth/signin', (req, res) => {
    try {
        const { username, password } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Check if IP is blocked
        if (authSystem.isIPBlocked(clientIP)) {
            return res.status(403).json({
                success: false,
                message: 'Your IP has been blocked. Contact administrator.'
            });
        }

        // Check login attempts
        const attemptCheck = authSystem.checkLoginAttempts(username);
        if (!attemptCheck.allowed) {
            return res.status(429).json({
                success: false,
                message: attemptCheck.message,
                locked: true,
                remainingMinutes: attemptCheck.remainingMinutes
            });
        }

        // Authenticate user
        const authResult = authSystem.authenticateUser(username, password, usersDatabase);

        if (!authResult.success) {
            // Record failed login
            const lockResult = authSystem.recordFailedLogin(username, clientIP);
            
            return res.status(401).json({
                success: false,
                message: authResult.message,
                remainingAttempts: lockResult.remainingAttempts,
                locked: lockResult.locked,
                lockDuration: lockResult.duration
            });
        }

        // Successful login - reset attempts
        authSystem.resetLoginAttempts(username);

        console.log(`✅ User logged in: ${username}`);

        // Update last activity for regular users
        if (!authResult.isAdmin && usersDatabase[username]) {
            usersDatabase[username].lastActivity = new Date().toISOString();
            saveUsersToCloudinary();
        }

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                username: authResult.user.username,
                createdAt: authResult.user.createdAt,
                isAdmin: authResult.isAdmin,
                isOwner: authResult.isAdmin ? authSystem.isOwner(username) : false,
                role: authResult.user.role || 'user'
            }
        });

    } catch (error) {
        console.error('❌ Signin error:', error);
        res.status(500).json({
            success: false,
            message: 'Signin failed',
            error: error.message
        });
    }
});

// 👤 UPDATE USER PROFILE
app.post('/api/user/profile/update', async (req, res) => {
    try {
        const { username, displayName, avatar } = req.body;

        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username is required'
            });
        }

        // Check if user is admin
        const isAdmin = authSystem.isAdmin(username);
        
        if (!usersDatabase[username] && !isAdmin) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // For admin accounts, profile is stored client-side only
        // Just return success with the data
        if (isAdmin) {
            res.json({
                success: true,
                message: 'Profile updated successfully (admin)',
                data: {
                    username: username,
                    displayName: displayName || username,
                    avatar: avatar || null,
                    isAdmin: true
                }
            });
            return;
        }

        // For regular users, update in database
        if (displayName) {
            usersDatabase[username].displayName = displayName;
        }
        if (avatar !== undefined) {
            usersDatabase[username].avatar = avatar;
        }

        usersDatabase[username].lastActivity = new Date().toISOString();
        await saveUsersToCloudinary();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                username: usersDatabase[username].username,
                displayName: usersDatabase[username].displayName,
                avatar: usersDatabase[username].avatar
            }
        });

    } catch (error) {
        console.error('❌ Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
});

// 👤 GET USER PROFILE
app.get('/api/user/profile/:username', (req, res) => {
    try {
        const { username } = req.params;

        // Check if user is admin
        const isAdmin = authSystem.isAdmin(username);
        
        if (!usersDatabase[username] && !isAdmin) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // For admin accounts, return basic info (profile stored client-side)
        if (isAdmin) {
            res.json({
                success: true,
                data: {
                    username: username,
                    displayName: username,
                    avatar: null,
                    isAdmin: true,
                    createdAt: new Date('2024-01-01')
                }
            });
            return;
        }

        // For regular users, get from database
        res.json({
            success: true,
            data: {
                username: usersDatabase[username].username,
                displayName: usersDatabase[username].displayName || username,
                avatar: usersDatabase[username].avatar,
                createdAt: usersDatabase[username].createdAt
            }
        });

    } catch (error) {
        console.error('❌ Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile',
            error: error.message
        });
    }
});

// 🗑️ DELETE FILE
app.delete('/api/file/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const { username } = req.body;

        const fileInfo = filesDatabase[code];

        if (!fileInfo) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Check if user owns this file
        if (fileInfo.uploadedBy !== username) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this file'
            });
        }

        // Delete from Cloudinary
        try {
            const publicId = fileInfo.cloudinaryPublicId;
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
            }
        } catch (error) {
            console.error('❌ Cloudinary delete error:', error);
        }

        // Remove from user's uploaded files list
        if (usersDatabase[username] && usersDatabase[username].uploadedFiles) {
            usersDatabase[username].uploadedFiles = usersDatabase[username].uploadedFiles.filter(
                fileCode => fileCode !== code
            );
            await saveUsersToCloudinary();
        }

        // Xóa khỏi database
        delete filesDatabase[code];
        await saveFilesToCloudinary();

        console.log(`🗑️ File deleted: ${fileInfo.originalName} (Code: ${code}) by ${username}`);

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

// Test endpoint - Get basic stats (no auth for debugging)
app.get('/api/admin/stats', (req, res) => {
    try {
        const regularUsers = Object.values(usersDatabase);
        const adminUsers = Object.values(predefinedAdmins);
        
        res.json({
            success: true,
            data: {
                totalUsers: regularUsers.length + adminUsers.length,
                regularUsers: regularUsers.length,
                admins: adminUsers.length,
                files: Object.keys(filesDatabase).length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// ADMIN CONSOLE API ENDPOINTS
// ============================================

// Admin Console Login
app.post('/api/admin/console/login', (req, res) => {
    try {
        const { username, password } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;

        // Check if IP is blocked
        if (authSystem.isIPBlocked(clientIP)) {
            return res.status(403).json({
                success: false,
                message: 'Your IP has been blocked'
            });
        }

        // Check if user is admin
        if (!authSystem.isAdmin(username)) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required. Only predefined admin accounts can login.'
            });
        }

        // Authenticate admin
        const authResult = authSystem.authenticateUser(username, password, usersDatabase);

        if (!authResult.success) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // If owner, allow direct login
        if (authSystem.isOwner(username)) {
            res.json({
                success: true,
                message: 'Owner login successful',
                data: {
                    username: authResult.user.username,
                    isAdmin: true,
                    isOwner: true,
                    role: authResult.user.role
                }
            });
            return;
        }

        // For other admins, create login request and wait for owner approval
        const requestId = authSystem.createAdminLoginRequest(username, clientIP);
        
        res.json({
            success: false,
            requiresApproval: true,
            message: 'Admin login requires owner approval. Please wait...',
            requestId: requestId
        });

    } catch (error) {
        console.error('❌ Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
});

// Check admin login request status
app.get('/api/admin/login-status/:requestId', (req, res) => {
    try {
        const { requestId } = req.params;
        const request = authSystem.checkAdminLoginStatus(requestId);
        
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }
        
        res.json({
            success: true,
            data: request
        });
    } catch (error) {
        console.error('❌ Check login status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check status'
        });
    }
});

// Get pending admin login requests (owner only)
app.get('/api/admin/pending-logins', (req, res) => {
    try {
        const { username } = req.query;
        
        if (!authSystem.isOwner(username)) {
            return res.status(403).json({
                success: false,
                message: 'Owner access required'
            });
        }
        
        const pendingRequests = authSystem.getPendingAdminLogins();
        
        res.json({
            success: true,
            data: pendingRequests
        });
    } catch (error) {
        console.error('❌ Get pending logins error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get pending logins'
        });
    }
});

// Approve admin login (owner only)
app.post('/api/admin/approve-login', (req, res) => {
    try {
        const { requestId, ownerUsername } = req.body;
        
        if (!authSystem.isOwner(ownerUsername)) {
            return res.status(403).json({
                success: false,
                message: 'Owner access required'
            });
        }
        
        const result = authSystem.approveAdminLogin(requestId);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Admin login approved',
                data: result.request
            });
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        console.error('❌ Approve login error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve login'
        });
    }
});

// Deny admin login and ban IP (owner only)
app.post('/api/admin/deny-login', (req, res) => {
    try {
        const { requestId, ownerUsername, reason } = req.body;
        
        if (!authSystem.isOwner(ownerUsername)) {
            return res.status(403).json({
                success: false,
                message: 'Owner access required'
            });
        }
        
        const result = authSystem.denyAdminLogin(requestId, reason);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Admin login denied and IP banned',
                data: result.request
            });
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        console.error('❌ Deny login error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to deny login'
        });
    }
});

// Get all users (owner only - admins can't see other admins)
app.get('/api/admin/console/users', (req, res) => {
    try {
        const { username } = req.query;

        if (!authSystem.isAdmin(username)) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        // Only owner can see all users including admins
        if (authSystem.isOwner(username)) {
            // Combine predefined admins and regular users
            const adminUsers = Object.values(predefinedAdmins);
            const regularUsers = Object.values(usersDatabase);
            const allUsers = [...adminUsers, ...regularUsers];

            res.json({
                success: true,
                data: allUsers
            });
        } else {
            // Regular admins only see regular users
            const regularUsers = Object.values(usersDatabase);
            
            res.json({
                success: true,
                data: regularUsers
            });
        }

    } catch (error) {
        console.error('❌ Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get users',
            error: error.message
        });
    }
});

// Get admin access requests (owner only)
app.get('/api/admin/console/access-requests', (req, res) => {
    try {
        const { username } = req.query;

        if (!authSystem.isOwner(username)) {
            return res.status(403).json({
                success: false,
                message: 'Owner access required'
            });
        }

        const requests = authSystem.getAdminAccessRequests();

        res.json({
            success: true,
            data: requests
        });

    } catch (error) {
        console.error('❌ Get access requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get access requests',
            error: error.message
        });
    }
});

// Handle admin access request (owner only)
app.post('/api/admin/console/access-request/:requestId', (req, res) => {
    try {
        const { requestId } = req.params;
        const { approved, ownerUsername } = req.body;

        const result = authSystem.handleAdminAccessRequest(requestId, approved, ownerUsername);

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }

    } catch (error) {
        console.error('❌ Handle access request error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process request',
            error: error.message
        });
    }
});

// Get blocked IPs (admin only)
app.get('/api/admin/console/blocked-ips', (req, res) => {
    try {
        const { username } = req.query;

        if (!authSystem.isAdmin(username)) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const blockedIPs = Object.values(authSystem.getBlockedIPs());

        res.json({
            success: true,
            data: blockedIPs
        });

    } catch (error) {
        console.error('❌ Get blocked IPs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get blocked IPs',
            error: error.message
        });
    }
});

// Get owner notifications (owner only)
app.get('/api/admin/console/notifications', (req, res) => {
    try {
        const { username } = req.query;

        if (!authSystem.isOwner(username)) {
            return res.status(403).json({
                success: false,
                message: 'Owner access required'
            });
        }

        const notifications = authSystem.getOwnerNotifications();

        res.json({
            success: true,
            data: notifications
        });

    } catch (error) {
        console.error('❌ Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get notifications',
            error: error.message
        });
    }
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 Handler - MUST BE LAST!
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
                message: 'File too large (max 10GB)'
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

app.listen(PORT, async () => {
    console.log('');
    console.log('🌌 ═══════════════════════════════════════════════');
    console.log('   SPACE FILE TRANSFER SERVER');
    console.log('🌌 ═══════════════════════════════════════════════');
    console.log('');
    console.log(`🚀 Server running on: http://localhost:${PORT}`);
    console.log(`☁️  Storage: Cloudinary (${process.env.CLOUDINARY_CLOUD_NAME})`);
    
    // Load users and files from Cloudinary
    await loadUsersFromCloudinary();
    await loadFilesFromCloudinary();
    
    console.log(`💾 Files in database: ${Object.keys(filesDatabase).length}`);
    console.log(`👥 Regular users: ${Object.keys(usersDatabase).length}`);
    console.log(`👑 Admins: ${Object.keys(predefinedAdmins).length}`);
    console.log('');
    console.log('👑 Admin Accounts:');
    Object.values(predefinedAdmins).forEach(admin => {
        console.log(`   ${admin.isOwner ? '👑' : '⭐'} ${admin.username} (${admin.role})`);
    });
    console.log(`⏰ File expiry time:`);
    console.log(`   < 100MB  = 30 hours`);
    console.log(`   < 1GB    = 24 hours`);
    console.log(`   < 5GB    = 12 hours`);
    console.log(`   >= 5GB   = 1 hour`);
    console.log(`👤 User expiry: 30 days of inactivity`);
    console.log('');
    console.log('📡 API Endpoints:');
    console.log(`   POST   /api/upload             - Upload file`);
    console.log(`   GET    /api/file/:code         - Get file info`);
    console.log(`   GET    /api/download/:code     - Download file`);
    console.log(`   GET    /api/files              - List all files`);
    console.log(`   GET    /api/user/:username/files - Get user's files`);
    console.log(`   DELETE /api/file/:code         - Delete file`);
    console.log(`   POST   /api/auth/signup        - User signup`);
    console.log(`   POST   /api/auth/signin        - User signin`);
    console.log('');
    console.log('👑 Admin Console Endpoints:');
    console.log(`   POST   /api/admin/console/login           - Admin login`);
    console.log(`   GET    /api/admin/console/users           - Get all users`);
    console.log(`   GET    /api/admin/console/access-requests - Get access requests`);
    console.log(`   POST   /api/admin/console/access-request/:id - Handle request`);
    console.log(`   GET    /api/admin/console/blocked-ips     - Get blocked IPs`);
    console.log(`   GET    /api/admin/console/notifications   - Get notifications`);
    console.log('');
    console.log('✨ Press Ctrl+C to stop');
    console.log('');
    
    // Check for expired files and inactive users on startup
    checkExpiredFiles();
    checkInactiveUsers();
});
