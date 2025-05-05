const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Проверка наличия необходимых переменных окружения
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('ОШИБКА: Отсутствуют необходимые переменные окружения для Cloudinary');
    throw new Error('Необходимо настроить CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY и CLOUDINARY_API_SECRET');
}

// Настройка Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// Конфигурация хранилища
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'products',
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif'],
        transformation: [{ width: 800, height: 800, crop: 'limit' }],
        resource_type: 'auto'
    }
});

// Создаем multer middleware с обработкой ошибок
const upload = multer({ 
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Разрешены только изображения!'), false);
        }
    }
});

// Middleware для логирования
const logUpload = (req, res, next) => {
    next();
};

const handleUploadError = (err, req, res, next) => {
    if (err) {
        let errorMessage = 'Ошибка при загрузке файла';
        
        if (err.message === 'File too large') {
            errorMessage = 'Размер файла превышает 5MB';
        } else if (err.message === 'Разрешены только изображения!') {
            errorMessage = err.message;
        } else if (err.http_code === 401) {
            errorMessage = 'Ошибка аутентификации в Cloudinary';
        } else if (err.http_code === 400) {
            errorMessage = 'Некорректный запрос к Cloudinary';
        }
        
        req.flash('error', errorMessage);
    }
    next();
};

const getFileUrl = (file) => {
    if (!file) {
        console.error('Файл не был загружен');
        return null;
    }
    return file.path;
};

module.exports = {
    upload,
    logUpload,
    handleUploadError,
    getFileUrl
}; 