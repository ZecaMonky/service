const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const { pool } = require('./config/database');
const viewVariables = require('./middleware/view-variables');

const app = express();
app.set('trust proxy', 1);

// Настройка шаблонизатора
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware для обработки методов DELETE и PUT
app.use((req, res, next) => {
    if (req.query._method === 'DELETE') {
        req.method = 'DELETE';
        req.url = req.path;
    } else if (req.query._method === 'PUT') {
        req.method = 'PUT';
        req.url = req.path;
    }
    next();
});

// Middleware для обработки PUT запросов
app.use((req, res, next) => {
    if (req.body && req.body._method === 'PUT') {
        req.method = 'PUT';
    }
    next();
});

// Настройка сессий через PostgreSQL
app.use(session({
    store: new pgSession({
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
}));

// Настройка flash-сообщений
app.use(flash());

// Добавляем переменные представления
app.use(viewVariables);

// Middleware для отладки сессии
app.use((req, res, next) => {
    console.log('Session:', req.session);
    next();
});

// Роуты
app.use('/', require('./routes/main'));
app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/shop', require('./routes/shop'));
app.use('/repair', require('./routes/repair'));

// Middleware для логирования ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка:', err);
    res.status(500).render('error', { 
        title: 'Ошибка',
        error: err,
        user: req.session.user || null
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
}); 