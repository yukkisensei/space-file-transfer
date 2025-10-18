// ============================================
// CLOUDINARY CONFIGURATION
// Free cloud storage alternative to local uploads/
// ============================================

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create Cloudinary storage for Multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'space-file-transfer', // Folder name in Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'zip', 'txt'], // Add more as needed
        resource_type: 'auto', // Automatically detect file type
        public_id: (req, file) => {
            // Generate unique filename
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            return uniqueSuffix + '-' + file.originalname;
        }
    }
});

module.exports = { cloudinary, storage };
