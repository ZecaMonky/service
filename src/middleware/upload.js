const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Расширенное логирование конфигурации
console.log('=== Cloudinary Configuration ===');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY);
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '***' : 'Not set');

// Настройка Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true // Используем HTTPS
});

// Временная конфигурация для отладки
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'products',
        upload_preset: 'products_unsigned'
    }
});

// Создаем multer middleware с обработкой ошибок
const upload = multer({ 
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Проверяем тип файла
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Разрешены только изображения!'), false);
        }
    }
});

// Middleware для логирования
const logUpload = (req, res, next) => {
    console.log('=== Upload Middleware ===');
    console.log('Request headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    next();
};

const handleUploadError = (err, req, res, next) => {
    console.error('=== Upload Error ===');
    console.error('Error details:', err);
    if (err) {
        if (err.message === 'File too large') {
            req.flash('error', 'Размер файла превышает 5MB');
        } else if (err.message === 'Разрешены только изображения!') {
            req.flash('error', err.message);
        } else {
            req.flash('error', 'Ошибка при загрузке файла: ' + err.message);
        }
    }
    next();
};

const getFileUrl = (file) => {
    console.log('Getting file URL for:', file);
    return file.path;
};

module.exports = {
    upload,
    logUpload,
    handleUploadError,
    getFileUrl
}; 