const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'products',
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif'],
        transformation: [{ width: 800, height: 800, crop: 'limit' }]
    }
});

const upload = multer({ storage });

const handleUploadError = (err, req, res, next) => {
    if (err) {
        req.flash('error', err.message);
    }
    next();
};

const getFileUrl = (file) => file.path; // Cloudinary возвращает URL в file.path

module.exports = {
    upload,
    handleUploadError,
    getFileUrl
}; 