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

// Роуты
app.use('/', require('./routes/main'));
app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/shop', require('./routes/shop'));
app.use('/repair', require('./routes/repair'));

// ВАЖНО: express.json() и express.urlencoded() должны идти после роутов с Multer!
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware для логирования ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка:', err);
    res.status(500).render('error', { 
        title: 'Ошибка',
        error: err,
        user: req.session.user || null
    });
});

// Перемещаем запуск сервера внутрь проверки подключения к БД
pool.connect((err, client, release) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.stack);
        // В продакшене, возможно, стоит завершить процесс:
        // process.exit(1);
    } else {
        console.log('Подключение к базе данных успешно установлено');
        client.query('SELECT NOW()', (err, result) => {
            release(); // Вернуть клиента в пул
            if (err) {
                console.error('Ошибка выполнения тестового запроса:', err.stack);
                // process.exit(1); // Выйти, если не удалось выполнить тестовый запрос
            } else {
                console.log('Тестовый запрос к базе данных выполнен успешно:', result.rows[0].now);

                const PORT = process.env.PORT || 3000;
                app.listen(PORT, () => {
                    console.log(`Сервер запущен на порту ${PORT}`);
                });
            }
        });
    }
}); 