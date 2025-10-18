// ============================================
// STORAGE CONFIGURATION - Cloudinary Only
// ============================================

const cloudinary = require('cloudinary').v2;

// ============================================
// CẤU HÌNH CLOUDINARY
// ============================================

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Giới hạn Cloudinary (GB)
const STORAGE_LIMIT = 24; // 24GB free tier

let storageUsage = 0; // GB

// ============================================
// KIỂM TRA DUNG LƯỢNG CLOUDINARY
// ============================================

async function checkCloudinaryUsage() {
    try {
        const result = await cloudinary.api.usage();
        const usedGB = result.storage.usage / (1024 * 1024 * 1024);
        const percentUsed = (usedGB / STORAGE_LIMIT) * 100;

        storageUsage = usedGB;

        console.log(`📊 Cloudinary: ${usedGB.toFixed(2)}GB / ${STORAGE_LIMIT}GB (${percentUsed.toFixed(1)}%)`);

        return {
            used: usedGB,
            limit: STORAGE_LIMIT,
            percent: percentUsed,
            available: STORAGE_LIMIT - usedGB
        };
    } catch (error) {
        console.error('❌ Error checking Cloudinary usage:', error);
        return null;
    }
}

// ============================================
// KIỂM TRA TRƯỚC KHI UPLOAD
// ============================================

async function checkStorageBeforeUpload(fileSize) {
    const fileSizeGB = fileSize / (1024 * 1024 * 1024);
    const usage = await checkCloudinaryUsage();

    if (!usage) {
        throw new Error('Cannot check storage usage');
    }

    // Kiểm tra nếu đầy 95%
    if (usage.percent >= 95) {
        await sendAdminNotification({
            type: 'critical',
            message: '🚨 CLOUDINARY ĐÃ ĐẦY! UPLOAD BỊ CHẶN!',
            usage
        });
        throw new Error('STORAGE_FULL');
    }

    // Cảnh báo nếu > 80%
    if (usage.percent > 80 && usage.percent < 95) {
        await sendAdminNotification({
            type: 'warning',
            message: `⚠️ Cloudinary sắp đầy: ${usage.percent.toFixed(1)}%`,
            usage
        });
    }

    // Kiểm tra nếu file quá lớn
    if (usage.available < fileSizeGB) {
        throw new Error('File too large for available storage');
    }

    return true;
}

// ============================================
// UPLOAD FILE LÊN CLOUDINARY
// ============================================

async function uploadFile(file, metadata = {}) {
    // Kiểm tra storage trước
    await checkStorageBeforeUpload(file.size);

    console.log(`📤 Uploading to Cloudinary...`);

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'space-file-transfer',
                resource_type: 'auto',
                public_id: metadata.publicId || `${Date.now()}-${metadata.filename}`,
                use_filename: false,
                unique_filename: true
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    storageUsage += file.size / (1024 * 1024 * 1024);
                    
                    resolve({
                        provider: 'cloudinary',
                        url: result.secure_url,
                        publicId: result.public_id,
                        size: file.size
                    });
                }
            }
        );
        uploadStream.end(file.buffer);
    });
}

// ============================================
// DELETE FILE
// ============================================

async function deleteFile(fileInfo) {
    await cloudinary.uploader.destroy(fileInfo.publicId);
    storageUsage -= fileInfo.size / (1024 * 1024 * 1024);
    if (storageUsage < 0) storageUsage = 0;
}

// ============================================
// GỬI THÔNG BÁO CHO ADMIN
// ============================================

async function sendAdminNotification(notification) {
    const timestamp = new Date().toISOString();
    const message = formatNotificationMessage(notification);

    console.log('\n' + '='.repeat(60));
    console.log('📧 ADMIN NOTIFICATION');
    console.log('='.repeat(60));
    console.log(message);
    console.log('='.repeat(60) + '\n');

    if (global.notificationsDatabase) {
        global.notificationsDatabase.push({
            timestamp,
            type: notification.type,
            message,
            data: notification,
            read: false
        });
    }
}

function formatNotificationMessage(notification) {
    let message = `🔔 YuFile Storage Notification\n\n`;
    message += `⏰ Time: ${new Date().toLocaleString('vi-VN')}\n`;
    message += `📌 Type: ${notification.type.toUpperCase()}\n\n`;

    if (notification.type === 'warning') {
        message += `⚠️ WARNING: ${notification.message}\n`;
        message += `💾 Usage: ${notification.usage.used.toFixed(2)}GB / ${notification.usage.limit}GB (${notification.usage.percent.toFixed(1)}%)\n`;
        message += `🔴 Available: ${notification.usage.available.toFixed(2)}GB\n`;
    } else if (notification.type === 'critical') {
        message += `🚨 CRITICAL: ${notification.message}\n`;
        message += `💾 Usage: ${notification.usage.used.toFixed(2)}GB / ${notification.usage.limit}GB (${notification.usage.percent.toFixed(1)}%)\n`;
    }

    return message;
}

// ============================================
// GET STORAGE STATUS (cho frontend)
// ============================================

async function getStorageStatus() {
    const usage = await checkCloudinaryUsage();
    
    if (!usage) {
        return {
            cloudinary: { used: 0, limit: STORAGE_LIMIT, percent: 0, available: STORAGE_LIMIT },
            total: { used: 0, limit: STORAGE_LIMIT, percent: 0, available: STORAGE_LIMIT },
            currentProvider: 'cloudinary',
            isStorageFull: false,
            uploadBlocked: false
        };
    }
    
    const isStorageFull = usage.percent >= 95;
    
    return {
        cloudinary: usage,
        total: {
            used: usage.used,
            limit: STORAGE_LIMIT,
            percent: usage.percent,
            available: usage.available
        },
        currentProvider: 'cloudinary',
        isStorageFull,
        uploadBlocked: isStorageFull,
        // For frontend compatibility
        usedGB: usage.used,
        totalFiles: 0 // Will be calculated from filesDatabase
    };
}

// ============================================
// MONITOR ĐỊNH KỲ
// ============================================

async function startStorageMonitoring(intervalMinutes = 60) {
    console.log(`🔍 Starting storage monitoring (every ${intervalMinutes} minutes)...`);

    await checkCloudinaryUsage();

    setInterval(async () => {
        const usage = await checkCloudinaryUsage();
        
        if (usage && usage.percent > 80) {
            await sendAdminNotification({
                type: 'warning',
                message: `Cloudinary usage: ${usage.percent.toFixed(1)}%`,
                usage
            });
        }
    }, intervalMinutes * 60 * 1000);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    uploadFile,
    deleteFile,
    checkCloudinaryUsage,
    sendAdminNotification,
    startStorageMonitoring,
    getStorageStatus,
    getStorageUsage: () => storageUsage
};
