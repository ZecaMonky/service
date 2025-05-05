const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Главная страница
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM products ORDER BY created_at DESC LIMIT 6');
        
        res.render('index', {
            title: 'Главная',
            products: result.rows || [],
            user: req.session.user
        });
    } catch (error) {
        console.error('Ошибка при загрузке главной страницы:', error);
        req.flash('error', 'Произошла ошибка при загрузке главной страницы');
        res.redirect('/');
    }
});

// Страница контактов
router.get('/contacts', (req, res) => {
    res.render('contacts', {
        title: 'Контакты',
        user: req.session.user
    });
});

// Обработка формы обратной связи
router.post('/contacts', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        // TODO: Добавить отправку email
        req.flash('success', 'Сообщение успешно отправлено!');
        res.redirect('/contacts');
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        req.flash('error', 'Произошла ошибка при отправке сообщения');
        res.redirect('/contacts');
    }
});

module.exports = router; 