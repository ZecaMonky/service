const { query, get, run } = require('../config/database');

// Middleware для логирования запросов
const requestLogger = async (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', async () => {
        const duration = Date.now() - start;
        
        try {
            await run(
                'INSERT INTO request_logs (method, path, status, duration, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    req.method,
                    req.path,
                    res.statusCode,
                    duration,
                    req.session.user ? req.session.user.id : null,
                    new Date()
                ]
            );
        } catch (error) {
            console.error('Ошибка при логировании запроса:', error);
        }
    });

    next();
};

module.exports = requestLogger; 