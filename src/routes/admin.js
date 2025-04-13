const express = require('express');
const router = express.Router();
const { query, get, run } = require('../config/database');
const { isAdmin } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

// Главная страница админ-панели
router.get('/', isAdmin, async (req, res) => {
    try {
        // Получаем статистику
        const users = await query('SELECT * FROM users');
        const products = await query('SELECT * FROM products');
        const repairRequests = await query('SELECT * FROM repair_requests ORDER BY created_at DESC LIMIT 5');
        const orders = await query('SELECT * FROM shop_orders ORDER BY created_at DESC LIMIT 5');

        res.render('admin/dashboard', {
            title: 'Панель администратора',
            users,
            products,
            repairRequests,
            orders
        });
    } catch (error) {
        console.error('Ошибка при загрузке админ-панели:', error);
        req.flash('error', 'Произошла ошибка при загрузке админ-панели');
        res.redirect('/');
    }
});

// Управление пользователями
router.get('/users', isAdmin, async (req, res) => {
    try {
        const users = await query('SELECT * FROM users');
        res.render('admin/users', {
            title: 'Управление пользователями',
            users,
            user: req.session.user
        });
    } catch (error) {
        console.error('Ошибка при загрузке списка пользователей:', error);
        req.flash('error', 'Произошла ошибка при загрузке списка пользователей');
        res.redirect('/admin');
    }
});

// Управление товарами
router.get('/products', isAdmin, async (req, res) => {
    try {
        const products = await query('SELECT * FROM products');
        res.render('admin/products', {
            title: 'Управление товарами',
            products,
            user: req.session.user
        });
    } catch (error) {
        console.error('Ошибка при загрузке списка товаров:', error);
        req.flash('error', 'Произошла ошибка при загрузке списка товаров');
        res.redirect('/admin');
    }
});

// Добавление товара
router.post('/products', isAdmin, upload.single('image'), handleUploadError, async (req, res) => {
    try {
        const { name, category, description, price, stock } = req.body;
        let imagePath = null;

        if (req.file) {
            imagePath = `/uploads/${req.file.filename}`;
        }

        await run(
            'INSERT INTO products (name, category, description, price, stock, image) VALUES (?, ?, ?, ?, ?, ?)',
            [name, category, description, price, stock, imagePath]
        );
        req.flash('success', 'Товар успешно добавлен');
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Ошибка при добавлении товара:', error);
        req.flash('error', 'Произошла ошибка при добавлении товара');
        res.redirect('/admin/products');
    }
});

// Страница добавления нового товара
router.get('/products/new', isAdmin, (req, res) => {
    res.render('admin/product-form', { product: null });
});

// Редактирование товара
router.post('/products/:id', isAdmin, upload.single('image'), handleUploadError, async (req, res) => {
    try {
        const { name, category, description, price, stock } = req.body;
        const productId = req.params.id;
        let imagePath = null;

        // Получаем существующий продукт
        const existingProduct = await get('SELECT image FROM products WHERE id = ?', [productId]);

        // Проверяем, был ли загружен новый файл
        if (req.file) {
            // Сохраняем относительный путь к изображению
            imagePath = `/uploads/${req.file.filename}`;
        } else {
            // Если новый файл не загружен, оставляем старое изображение
            imagePath = existingProduct ? existingProduct.image : null;
        }

        await run(
            'UPDATE products SET name = ?, category = ?, description = ?, price = ?, stock = ?, image = ? WHERE id = ?',
            [name, category, description, price, stock, imagePath, productId]
        );
        req.flash('success', 'Товар успешно обновлен');
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Ошибка при обновлении товара:', error);
        req.flash('error', 'Ошибка при обновлении товара');
        res.redirect('/admin/products');
    }
});

// Удаление товара
router.delete('/products/:id', isAdmin, async (req, res) => {
    try {
        // Сначала удаляем связанные записи в order_items
        await run('DELETE FROM order_items WHERE product_id = ?', [req.params.id]);
        
        // Теперь можно удалить сам товар
        await run('DELETE FROM products WHERE id = ?', [req.params.id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка при удалении товара:', error);
        res.status(500).json({ success: false, error: 'Ошибка при удалении товара' });
    }
});

// Управление заявками на ремонт
router.get('/repairs', isAdmin, async (req, res) => {
    try {
        const repairs = await query(`
            SELECT r.*, u.name as user_name, u.email as user_email 
            FROM repair_requests r 
            JOIN users u ON r.user_id = u.id 
            ORDER BY r.created_at DESC
        `);
        res.render('admin/repairs', {
            title: 'Управление заявками на ремонт',
            repairs,
            user: req.session.user
        });
    } catch (error) {
        console.error('Ошибка при загрузке списка заявок:', error);
        req.flash('error', 'Произошла ошибка при загрузке списка заявок');
        res.redirect('/admin');
    }
});

// Обновление статуса заявки
router.post('/repairs/:id/status', isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        await run(
            'UPDATE repair_requests SET status = ? WHERE id = ?',
            [status, req.params.id]
        );
        req.flash('success', 'Статус заявки успешно обновлен');
        res.redirect('/admin/repairs');
    } catch (error) {
        console.error('Ошибка при обновлении статуса заявки:', error);
        req.flash('error', 'Произошла ошибка при обновлении статуса заявки');
        res.redirect('/admin/repairs');
    }
});

// Управление заказами
router.get('/orders', isAdmin, async (req, res) => {
    try {
        const orders = await query(`
            SELECT o.*, u.name as user_name, u.email as user_email 
            FROM shop_orders o 
            JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC
        `);
        res.render('admin/orders', {
            title: 'Управление заказами',
            orders,
            user: req.session.user
        });
    } catch (error) {
        console.error('Ошибка при загрузке списка заказов:', error);
        req.flash('error', 'Произошла ошибка при загрузке списка заказов');
        res.redirect('/admin');
    }
});

// Обновление статуса заказа
router.post('/orders/:id/status', isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        await run(
            'UPDATE shop_orders SET status = ? WHERE id = ?',
            [status, req.params.id]
        );
        req.flash('success', 'Статус заказа успешно обновлен');
        res.redirect('/admin/orders');
    } catch (error) {
        console.error('Ошибка при обновлении статуса заказа:', error);
        req.flash('error', 'Произошла ошибка при обновлении статуса заказа');
        res.redirect('/admin/orders');
    }
});

// Удаление пользователя
router.delete('/users/:id', isAdmin, async (req, res) => {
    try {
        await run('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка при удалении пользователя:', error);
        res.status(500).json({ success: false, error: 'Ошибка при удалении пользователя' });
    }
});

// Обновление пользователя
router.put('/users/:id', isAdmin, async (req, res) => {
    try {
        const { name, email, role } = req.body;
        await run(
            'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
            [name, email, role, req.params.id]
        );
        req.flash('success', 'Пользователь успешно обновлен');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Ошибка при обновлении пользователя:', error);
        req.flash('error', 'Ошибка при обновлении пользователя');
        res.redirect('/admin/users');
    }
});

// Удаление заявки на ремонт
router.delete('/repairs/:id', isAdmin, async (req, res) => {
    try {
        await run('DELETE FROM repair_requests WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка при удалении заявки:', error);
        res.status(500).json({ success: false, error: 'Ошибка при удалении заявки' });
    }
});

// Обновление статуса заявки
router.put('/repairs/:id', isAdmin, async (req, res) => {
    try {
        const { status, comment } = req.body;
        await run(
            'UPDATE repair_requests SET status = ?, comment = ? WHERE id = ?',
            [status, comment, req.params.id]
        );
        req.flash('success', 'Статус заявки успешно обновлен');
        res.redirect('/admin/repairs');
    } catch (error) {
        console.error('Ошибка при обновлении статуса заявки:', error);
        req.flash('error', 'Ошибка при обновлении статуса заявки');
        res.redirect('/admin/repairs');
    }
});

// Удаление заказа
router.delete('/orders/:id', isAdmin, async (req, res) => {
    try {
        await run('DELETE FROM shop_orders WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка при удалении заказа:', error);
        res.status(500).json({ success: false, error: 'Ошибка при удалении заказа' });
    }
});

// Обновление заказа
router.put('/orders/:id', isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        await run(
            'UPDATE shop_orders SET status = ? WHERE id = ?',
            [status, req.params.id]
        );
        req.flash('success', 'Заказ успешно обновлен');
        res.redirect('/admin/orders');
    } catch (error) {
        console.error('Ошибка при обновлении заказа:', error);
        req.flash('error', 'Ошибка при обновлении заказа');
        res.redirect('/admin/orders');
    }
});

// Редактирование пользователя
router.get('/users/:id/edit', isAdmin, async (req, res) => {
    try {
        const user = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (!user) {
            req.flash('error', 'Пользователь не найден');
            return res.redirect('/admin/users');
        }
        res.render('admin/user-form', { user });
    } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
        req.flash('error', 'Ошибка при получении данных пользователя');
        res.redirect('/admin/users');
    }
});

// Редактирование товара
router.get('/products/:id', isAdmin, async (req, res) => {
    try {
        const product = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) {
            req.flash('error', 'Товар не найден');
            return res.redirect('/admin/products');
        }
        res.render('admin/product-form', { product });
    } catch (error) {
        console.error('Ошибка при получении данных товара:', error);
        req.flash('error', 'Ошибка при получении данных товара');
        res.redirect('/admin/products');
    }
});

// Редактирование заявки на ремонт
router.get('/repairs/:id/edit', isAdmin, async (req, res) => {
    try {
        const repair = await get(`
            SELECT r.*, u.name as user_name 
            FROM repair_requests r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.id = ?
        `, [req.params.id]);
        
        if (!repair) {
            req.flash('error', 'Заявка не найдена');
            return res.redirect('/admin/repairs');
        }
        res.render('admin/repair-details', { repair });
    } catch (error) {
        console.error('Ошибка при получении данных заявки:', error);
        req.flash('error', 'Ошибка при получении данных заявки');
        res.redirect('/admin/repairs');
    }
});

// Редактирование заказа
router.get('/orders/:id/edit', isAdmin, async (req, res) => {
    try {
        const order = await get(`
            SELECT o.*, u.name as user_name,
                   GROUP_CONCAT(p.name) as product_names,
                   GROUP_CONCAT(oi.quantity) as quantities,
                   GROUP_CONCAT(oi.price) as prices
            FROM shop_orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.id = ?
            GROUP BY o.id
        `, [req.params.id]);
        
        if (!order) {
            req.flash('error', 'Заказ не найден');
            return res.redirect('/admin/orders');
        }
        
        // Преобразуем строки с товарами в массив объектов
        const items = order.product_names ? order.product_names.split(',').map((name, index) => ({
            product_name: name,
            quantity: order.quantities.split(',')[index],
            price: order.prices.split(',')[index]
        })) : [];
        
        order.items = items;
        res.render('admin/order-details', { order });
    } catch (error) {
        console.error('Ошибка при получении данных заказа:', error);
        req.flash('error', 'Ошибка при получении данных заказа');
        res.redirect('/admin/orders');
    }
});

module.exports = router; 