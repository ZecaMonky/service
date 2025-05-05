const { query, get, run } = require('../config/database');

// Middleware для валидации данных пользователя
const validateUserData = async (req, res, next) => {
    const { name, email, password } = req.body;

    // Проверка имени
    if (!name || name.length < 2) {
        req.flash('error', 'Имя должно содержать не менее 2 символов');
        return res.redirect('/auth/register');
    }

    // Проверка email
    if (!email || !email.includes('@')) {
        req.flash('error', 'Введите корректный email');
        return res.redirect('/auth/register');
    }

    // Проверка существования email
    const existingUser = await get('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser) {
        req.flash('error', 'Пользователь с таким email уже существует');
        return res.redirect('/auth/register');
    }

    // Проверка пароля
    if (!password || password.length < 6) {
        req.flash('error', 'Пароль должен содержать не менее 6 символов');
        return res.redirect('/auth/register');
    }

    next();
};

// Middleware для валидации данных заявки на ремонт
const validateRepairRequest = (req, res, next) => {
    const { deviceType, issue, contactPhone } = req.body;

    if (!deviceType) {
        req.flash('error', 'Укажите тип устройства');
        return res.redirect('/repair');
    }

    if (!issue) {
        req.flash('error', 'Опишите проблему');
        return res.redirect('/repair');
    }

    if (!contactPhone) {
        req.flash('error', 'Укажите контактный телефон');
        return res.redirect('/repair');
    }

    next();
};

// Middleware для валидации данных товара
const validateProductData = (req, res, next) => {
    const { name, category, price, stock } = req.body;

    if (!name) {
        req.flash('error', 'Укажите название товара');
        return res.redirect('/admin/products');
    }

    if (!category) {
        req.flash('error', 'Укажите категорию товара');
        return res.redirect('/admin/products');
    }

    if (!price || isNaN(price) || price <= 0) {
        req.flash('error', 'Укажите корректную цену товара');
        return res.redirect('/admin/products');
    }

    if (!stock || isNaN(stock) || stock < 0) {
        req.flash('error', 'Укажите корректное количество товара');
        return res.redirect('/admin/products');
    }

    next();
};

module.exports = {
    validateUserData,
    validateRepairRequest,
    validateProductData
}; 