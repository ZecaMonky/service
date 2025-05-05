const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Расширенное логирование конфигурации
console.log('=== Cloudinary Configuration ===');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY);
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '***' : 'Not set');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Временная конфигурация для отладки
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'products',
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif'],
        transformation: [{ width: 800, height: 800, crop: 'limit' }]
        // Временно убираем upload_preset для отладки
    }
});

// Добавляем обработчик ошибок multer
const upload = multer({ 
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
}).single('image');

// Обертка для middleware с дополнительным логированием
const uploadMiddleware = (req, res, next) => {
    console.log('=== Upload Middleware ===');
    console.log('Request headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    
    upload(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            return next(err);
        }
        console.log('Upload successful');
        console.log('File:', req.file);
        next();
    });
};

const handleUploadError = (err, req, res, next) => {
    console.error('=== Upload Error ===');
    console.error('Error details:', err);
    if (err) {
        req.flash('error', err.message);
    }
    next();
};

const getFileUrl = (file) => {
    console.log('Getting file URL for:', file);
    return file.path;
};

module.exports = {
    upload: uploadMiddleware,
    handleUploadError,
    getFileUrl
}; 