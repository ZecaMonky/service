const { query, get, run } = require('../config/database');

// Функция валидации пароля
const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 8) {
        errors.push('Пароль должен содержать минимум 8 символов');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Пароль должен содержать хотя бы одну заглавную букву');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Пароль должен содержать хотя бы одну строчную букву');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Пароль должен содержать хотя бы одну цифру');
    }
    if (!/[!@#$%^&*]/.test(password)) {
        errors.push('Пароль должен содержать хотя бы один специальный символ (!@#$%^&*)');
    }
    
    return errors;
};

// Функция валидации телефона
const validatePhone = (phone) => {
    // Удаляем все нецифровые символы
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Проверяем длину и формат
    if (cleanPhone.length !== 11) {
        return false;
    }
    
    // Проверяем, что номер начинается с 7 или 8
    if (!/^[78]/.test(cleanPhone)) {
        return false;
    }
    
    return true;
};

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
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
        req.flash('error', passwordErrors.join(', '));
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

    if (!contactPhone || !validatePhone(contactPhone)) {
        req.flash('error', 'Укажите корректный номер телефона (например: +7 (999) 123-45-67)');
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
    validateProductData,
    validatePassword,
    validatePhone
}; 