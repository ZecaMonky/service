const { query, get } = require('./src/config/database');

async function checkDatabase() {
    try {
        console.log('Проверка таблиц...');
        const tables = await query("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('Таблицы в базе данных:', tables.map(t => t.name));

        console.log('\nПроверка пользователей...');
        const users = await query('SELECT id, name, email, role FROM users');
        console.log('Пользователи:', users);

        console.log('\nПроверка товаров...');
        const products = await query('SELECT id, name, price, category FROM products');
        console.log('Товары:', products);

    } catch (error) {
        console.error('Ошибка при проверке базы данных:', error);
    }
}

checkDatabase(); 