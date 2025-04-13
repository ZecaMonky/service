const { query, get, run } = require('../config/database');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');

// Определяем путь к файлу сессий
const sessionsPath = process.env.NODE_ENV === 'production'
    ? path.join(process.cwd(), 'database', 'sessions.db')
    : path.join(__dirname, '../../database/sessions.db');

// Middleware для настройки сессий
const sessionMiddleware = session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: process.env.NODE_ENV === 'production' ? './database' : path.join(__dirname, '../../database')
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 часа
    }
});

// Middleware для обновления времени последней активности пользователя
const updateLastActivity = async (req, res, next) => {
    if (req.session.user) {
        try {
            await run(
                'UPDATE users SET last_activity = ? WHERE id = ?',
                [new Date(), req.session.user.id]
            );
        } catch (error) {
            console.error('Ошибка при обновлении времени последней активности:', error);
        }
    }
    next();
};

module.exports = {
    sessionMiddleware,
    updateLastActivity
}; 