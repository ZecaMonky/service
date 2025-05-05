const { run, pool } = require('../config/database');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);

// Middleware для настройки сессий через PostgreSQL
const sessionMiddleware = session({
    store: new PgSession({
        pool: pool,
        tableName: 'session'
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
                'UPDATE users SET last_activity = $1 WHERE id = $2',
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