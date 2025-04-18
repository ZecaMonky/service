const express = require('express');
const router = express.Router();
const { query, get, run } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// Страница заявки на ремонт
router.get('/', (req, res) => {
    res.render('repair/form', {
        title: 'Заявка на ремонт',
        user: req.session.user,
        style: '',
        script: ''
    });
});

// Отправка заявки на ремонт
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const { deviceType, deviceModel, issue, contactPhone } = req.body;
        
        const result = await run(
            'INSERT INTO repair_requests (user_id, device_type, device_model, issue, contact_phone) VALUES (?, ?, ?, ?, ?)',
            [req.session.user.id, deviceType, deviceModel, issue, contactPhone]
        );
        
        req.flash('success', 'Заявка успешно отправлена!');
        res.redirect(`/repair/status/${result.lastID}`);
    } catch (error) {
        console.error('Ошибка при отправке заявки:', error);
        req.flash('error', 'Произошла ошибка при отправке заявки');
        res.redirect('/repair');
    }
});

// Страница статуса заявки
router.get('/status/:id', isAuthenticated, async (req, res) => {
    try {
        const request = await get(
            'SELECT * FROM repair_requests WHERE id = ? AND user_id = ?',
            [req.params.id, req.session.user.id]
        );

        if (!request) {
            req.flash('error', 'Заявка не найдена');
            return res.redirect('/repair');
        }

        res.render('repair/status', {
            title: 'Статус заявки',
            request,
            user: req.session.user,
            style: '',
            script: ''
        });
    } catch (error) {
        console.error('Ошибка при получении статуса заявки:', error);
        req.flash('error', 'Произошла ошибка при получении статуса заявки');
        res.redirect('/repair');
    }
});

// История заявок
router.get('/history', isAuthenticated, async (req, res) => {
    try {
        const requests = await query(
            'SELECT * FROM repair_requests WHERE user_id = ? ORDER BY created_at DESC',
            [req.session.user.id]
        );

        res.render('repair/history', {
            title: 'История заявок',
            requests,
            user: req.session.user,
            style: '',
            script: ''
        });
    } catch (error) {
        console.error('Ошибка при загрузке истории заявок:', error);
        req.flash('error', 'Произошла ошибка при загрузке истории заявок');
        res.redirect('/');
    }
});

module.exports = router; 