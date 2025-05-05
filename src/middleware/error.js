const { query, get, run } = require('../config/database');

// Middleware для обработки ошибок
const errorHandler = (err, req, res, next) => {
    console.error('Ошибка:', err);
    
    // Логируем ошибку в базу данных
    run(
        'INSERT INTO error_logs (message, stack, user_id, created_at) VALUES ($1, $2, $3, $4)',
        [err.message, err.stack, req.session.user ? req.session.user.id : null, new Date()]
    ).catch(console.error);

    // Отправляем ответ пользователю
    res.status(500).render('error', {
        title: 'Ошибка',
        message: 'Произошла ошибка на сервере',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
};

module.exports = errorHandler;