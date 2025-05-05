const express = require('express');
const router = express.Router();
const { query, get, run } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Страница заявок на ремонт
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const result = await query(`
            SELECT r.*, u.name as user_name 
            FROM repair_requests r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.user_id = $1 
            ORDER BY r.created_at DESC
        `, [req.session.user.id]);
        
        res.render('repair/index', {
            title: 'Заявки на ремонт',
            repairs: result.rows || [],
            user: req.session.user
        });
    } catch (error) {
        console.error('Ошибка при загрузке заявок:', error);
        req.flash('error', 'Произошла ошибка при загрузке заявок');
        res.redirect('/');
    }
});

// Страница создания заявки
router.get('/create', isAuthenticated, (req, res) => {
    res.render('repair/create', {
        title: 'Создать заявку на ремонт',
        user: req.session.user
    });
});

// Обработка создания заявки
router.post('/create', isAuthenticated, upload.single('photo'), async (req, res) => {
    try {
        const { device_type, model, problem_description } = req.body;
        const photo_url = req.file ? req.file.path : null;

        await query(`
            INSERT INTO repair_requests (user_id, device_type, model, problem_description, photo_url, status)
            VALUES ($1, $2, $3, $4, $5, 'pending')
        `, [req.session.user.id, device_type, model, problem_description, photo_url]);

        req.flash('success', 'Заявка успешно создана');
        res.redirect('/repair');
    } catch (error) {
        console.error('Ошибка при создании заявки:', error);
        req.flash('error', 'Произошла ошибка при создании заявки');
        res.redirect('/repair/create');
    }
});

// Страница просмотра заявки
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const repair = await get(`
            SELECT r.*, u.name as user_name 
            FROM repair_requests r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.id = $1 AND r.user_id = $2
        `, [req.params.id, req.session.user.id]);
        
        if (!repair) {
            req.flash('error', 'Заявка не найдена');
            return res.redirect('/repair');
        }

        res.render('repair/view', {
            title: 'Просмотр заявки',
            repair,
            user: req.session.user
        });
    } catch (error) {
        console.error('Ошибка при загрузке заявки:', error);
        req.flash('error', 'Произошла ошибка при загрузке заявки');
        res.redirect('/repair');
    }
});

// Страница статуса заявки
router.get('/status/:id', isAuthenticated, async (req, res) => {
    try {
        const request = await get(
            'SELECT * FROM repair_requests WHERE id = $1 AND user_id = $2',
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
            'SELECT * FROM repair_requests WHERE user_id = $1 ORDER BY created_at DESC',
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