const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');

// Определяем путь к файлу базы данных
const dbPath = process.env.NODE_ENV === 'production' 
    ? path.join(process.cwd(), 'database', 'database.sqlite')
    : path.join(__dirname, '../../database/database.sqlite');

// Проверяем существование директории и создаем её, если нужно
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Создаем подключение к базе данных с обработкой ошибок
let db;
try {
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Ошибка при подключении к базе данных:', err);
            process.exit(1);
        }
        console.log('Подключение к базе данных успешно установлено');
        console.log('Путь к базе данных:', dbPath);
    });
} catch (err) {
    console.error('Критическая ошибка при создании подключения к базе данных:', err);
    process.exit(1);
}

// Включаем поддержку внешних ключей
db.run('PRAGMA foreign_keys = ON', (err) => {
    if (err) {
        console.error('Ошибка при включении внешних ключей:', err);
    }
});

// Создаем обертку для выполнения запросов с промисами
const query = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Создаем обертку для получения одной записи
const get = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// Создаем обертку для выполнения команд без возврата данных
const run = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

// Функция инициализации базы данных
const initializeDatabase = async () => {
    try {
        console.log('Начало инициализации базы данных...');
        
        // Проверяем доступность базы данных
        await new Promise((resolve, reject) => {
            db.get('SELECT 1', (err) => {
                if (err) {
                    console.error('База данных недоступна:', err);
                    reject(err);
                } else {
                    console.log('База данных доступна');
                    resolve();
                }
            });
        });

        // Создаем таблицу пользователей
        await run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Создаем таблицу продуктов
        await run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                category TEXT NOT NULL,
                stock INTEGER NOT NULL DEFAULT 0,
                image TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Создаем таблицу заказов
        await run(`
            CREATE TABLE IF NOT EXISTS shop_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                address TEXT NOT NULL,
                phone TEXT NOT NULL,
                comment TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Создаем таблицу товаров в заказе
        await run(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (order_id) REFERENCES shop_orders(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `);

        // Создаем таблицу заявок на ремонт
        await run(`
            CREATE TABLE IF NOT EXISTS repair_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                device_type TEXT NOT NULL,
                device_model TEXT NOT NULL,
                issue TEXT NOT NULL,
                contact_phone TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Проверяем, есть ли уже тестовый администратор
        const adminExists = await get('SELECT * FROM users WHERE email = ?', ['admin@example.com']);
        
        if (!adminExists) {
            // Добавляем тестового администратора
            const adminPassword = await bcrypt.hash('admin123', 10);
            await run(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Администратор', 'admin@example.com', adminPassword, 'admin']
            );
        }

        // Проверяем, есть ли уже тестовые товары
        const productsCount = await get('SELECT COUNT(*) as count FROM products');
        
        if (productsCount.count === 0) {
            // Добавляем тестовые продукты только если таблица пуста
            const products = [
                ['Смартфон Samsung Galaxy S21', 'Новейший смартфон от Samsung', 79999.99, 'smartphones', 10, '/images/s21.jpg'],
                ['Ноутбук ASUS ROG', 'Игровой ноутбук с мощной видеокартой', 129999.99, 'laptops', 5, '/images/rog.jpg'],
                ['Наушники Sony WH-1000XM4', 'Беспроводные наушники с шумоподавлением', 29999.99, 'headphones', 15, '/images/sony.jpg']
            ];

            for (const product of products) {
                await run(
                    'INSERT INTO products (name, description, price, category, stock, image) VALUES (?, ?, ?, ?, ?, ?)',
                    product
                );
            }
            
            console.log('Тестовые товары добавлены');
        }

        console.log('База данных успешно инициализирована');
    } catch (error) {
        console.error('Ошибка при инициализации базы данных:', error);
        // Не завершаем процесс, так как это может быть временная ошибка
    }
};

// Инициализируем базу данных при запуске
initializeDatabase().catch(err => {
    console.error('Критическая ошибка при инициализации:', err);
});

// Обработка закрытия соединения при завершении приложения
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Ошибка при закрытии соединения:', err);
        }
        console.log('Соединение с базой данных закрыто');
        process.exit(0);
    });
});

module.exports = {
    query,
    get,
    run
}; 