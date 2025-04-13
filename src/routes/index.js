const express = require('express');
const router = express.Router();
const { query, get, run } = require('../config/database');

// Главная страница
router.get('/', async (req, res) => {
    try {
        const [featuredProducts, latestRepairs] = await Promise.all([
            query('SELECT * FROM products ORDER BY RANDOM() LIMIT 6'),
            query(`
                SELECT r.*, u.name as user_name 
                FROM repair_requests r 
                JOIN users u ON r.user_id = u.id 
                ORDER BY r.created_at DESC 
                LIMIT 5
            `)
        ]);

        res.render('index', {
            title: 'Сервисный центр',
            featuredProducts,
            latestRepairs,
            user: req.session.user
        });
    } catch (error) {
        console.error('Ошибка при загрузке главной страницы:', error);
        req.flash('error', 'Произошла ошибка при загрузке главной страницы');
        res.render('index', {
            title: 'Сервисный центр',
            featuredProducts: [],
            latestRepairs: [],
            user: req.session.user
        });
    }
});

// Страница о нас
router.get('/about', (req, res) => {
    res.render('about', {
        title: 'О нас',
        user: req.session.user
    });
});

// Страница контактов
router.get('/contacts', (req, res) => {
    res.render('contacts', {
        title: 'Контакты',
        user: req.session.user
    });
});

module.exports = router; 