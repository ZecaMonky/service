const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Проверка наличия необходимых переменных окружения
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('ОШИБКА: Отсутствуют необходимые переменные окружения для Cloudinary');
    throw new Error('Необходимо настроить CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY и CLOUDINARY_API_SECRET');
}

// Расширенное логирование конфигурации
console.log('=== Cloudinary Configuration ===');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY);
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '***' : 'Not set');

// Настройка Cloudinary с дополнительными параметрами
const config = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
    api_key: process.env.CLOUDINARY_API_KEY.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
    secure: true
};

console.log('=== Cloudinary Config Object ===');
console.log(JSON.stringify(config, null, 2));

cloudinary.config(config);

// Проверка конфигурации Cloudinary
cloudinary.api.ping()
    .then(() => {
        console.log('Cloudinary connection successful');
        console.log('Current cloud name:', cloudinary.config().cloud_name);
    })
    .catch(err => {
        console.error('ОШИБКА подключения к Cloudinary:', err);
        console.error('Текущая конфигурация:', cloudinary.config());
        throw err;
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
        let errorMessage = 'Ошибка при загрузке файла';
        
        if (err.message === 'File too large') {
            errorMessage = 'Размер файла превышает 5MB';
        } else if (err.message === 'Разрешены только изображения!') {
            errorMessage = err.message;
        } else if (err.http_code === 401) {
            errorMessage = 'Ошибка аутентификации в Cloudinary. Проверьте настройки API.';
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
    console.log('Getting file URL for:', file);
    return file.path;
};

module.exports = {
    upload,
    logUpload,
    handleUploadError,
    getFileUrl
}; 