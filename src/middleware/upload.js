const { query, get, run } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Определяем путь к директории загрузок
const uploadDir = process.env.NODE_ENV === 'production'
    ? path.join(process.cwd(), 'public', 'uploads')
    : path.join(__dirname, '../public/uploads');

// Создаем директорию для загрузок, если она не существует
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка хранилища для загруженных файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
        cb(null, filename);
    }
});

// Фильтр для проверки типа файла
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Недопустимый тип файла. Разрешены только изображения.'), false);
    }
};

// Middleware для загрузки файлов
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Middleware для обработки ошибок загрузки
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            req.flash('error', 'Размер файла превышает допустимый лимит (5MB)');
        } else {
            req.flash('error', 'Произошла ошибка при загрузке файла');
        }
    } else if (err) {
        req.flash('error', err.message);
    }
    next();
};

// Функция для получения URL файла
const getFileUrl = (filename) => {
    if (process.env.NODE_ENV === 'production') {
        return `${process.env.STORAGE_URL}/${filename}`;
    }
    return `/uploads/${filename}`;
};

module.exports = {
    upload,
    handleUploadError,
    getFileUrl
}; 