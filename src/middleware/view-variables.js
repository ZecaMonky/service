module.exports = (req, res, next) => {
    // Добавляем базовые переменные для всех представлений
    res.locals.style = '';
    res.locals.script = '';
    res.locals.user = req.session.user || null;
    res.locals.error = req.flash('error') || [];
    res.locals.success = req.flash('success') || [];
    res.locals.title = 'Сервисный центр';
    next();
}; 