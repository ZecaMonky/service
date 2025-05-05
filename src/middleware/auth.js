const { query, get, run } = require('../config/database');

// Middleware для проверки авторизации
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        req.flash('error', 'Для доступа к этой странице необходимо авторизоваться');
        res.redirect('/auth/login');
    }
};

// Middleware для проверки прав администратора
const isAdmin = async (req, res, next) => {
    if (req.session.user) {
        const user = await get('SELECT role FROM users WHERE id = $1', [req.session.user.id]);
        if (user && user.role === 'admin') {
            next();
        } else {
            req.flash('error', 'Доступ запрещен');
            res.redirect('/');
        }
    } else {
        req.flash('error', 'Для доступа к этой странице необходимо авторизоваться');
        res.redirect('/auth/login');
    }
};

module.exports = {
    isAuthenticated,
    isAdmin
};