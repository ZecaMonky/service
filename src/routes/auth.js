const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { query, get, run } = require('../config/database');
const { validateUserData } = require('../middleware/validation');

// Страница входа
router.get('/login', (req, res) => {
    res.render('auth/login', {
        title: 'Вход',
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// Обработка входа
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Получаем пользователя
        const user = await get('SELECT * FROM users WHERE email = $1', [email]);
        
        if (!user) {
            req.flash('error', 'Неверный email или пароль');
            return res.redirect('/auth/login');
        }
        
        // Проверяем пароль
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            req.flash('error', 'Неверный email или пароль');
            return res.redirect('/auth/login');
        }
        
        // Сохраняем пользователя в сессии
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        console.log('После логина, req.session:', req.session);
        req.session.save((err) => {
            if (err) {
                console.error('Ошибка при сохранении сессии:', err);
            }
            req.flash('success', `Добро пожаловать, ${user.name}!`);
            res.redirect('/');
        });
    } catch (error) {
        console.error('Ошибка при входе:', error);
        req.flash('error', 'Произошла ошибка при входе в систему');
        res.redirect('/auth/login');
    }
});

// Страница регистрации
router.get('/register', (req, res) => {
    res.render('auth/register', {
        title: 'Регистрация',
        error: req.flash('error')
    });
});

// Обработка регистрации
router.post('/register', validateUserData, async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Проверяем, существует ли пользователь
        const existingUser = await get('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser) {
            req.flash('error', 'Пользователь с таким email уже существует');
            return res.redirect('/auth/register');
        }

        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(password, 10);

        // Создаем нового пользователя
        await run(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
            [name, email, hashedPassword]
        );

        req.flash('success', 'Регистрация успешно завершена. Теперь вы можете войти.');
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        req.flash('error', 'Произошла ошибка при регистрации');
        res.redirect('/auth/register');
    }
});

// Выход
router.get('/logout', (req, res) => {
    // Сохраняем flash-сообщение перед уничтожением сессии
    req.flash('success', 'Вы успешно вышли из системы');
    
    // Уничтожаем сессию
    req.session.destroy((err) => {
        if (err) {
            console.error('Ошибка при выходе:', err);
            return res.redirect('/');
        }
        // После уничтожения сессии переадресуем пользователя на главную
        res.redirect('/');
    });
});

module.exports = router; 