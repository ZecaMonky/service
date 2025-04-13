const { query, get, run } = require('../config/database');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');

// Middleware для защиты от атак
const securityMiddleware = [
    // Защита от XSS
    xss(),
    
    // Базовые настройки безопасности
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
                styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
                imgSrc: ["'self'", 'data:', 'cdn.jsdelivr.net'],
                connectSrc: ["'self'"]
            }
        }
    }),
    
    // Ограничение количества запросов
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 минут
        max: 100 // максимум 100 запросов за 15 минут
    })
];

// Middleware для проверки блокировки IP
const checkIpBlock = async (req, res, next) => {
    try {
        const ip = req.ip;
        const blockedIp = await get(
            'SELECT * FROM blocked_ips WHERE ip = ? AND expires_at > ?',
            [ip, new Date()]
        );

        if (blockedIp) {
            return res.status(403).render('error', {
                title: 'Доступ запрещен',
                message: 'Ваш IP-адрес заблокирован'
            });
        }

        next();
    } catch (error) {
        console.error('Ошибка при проверке блокировки IP:', error);
        next();
    }
};

module.exports = {
    securityMiddleware,
    checkIpBlock
}; 