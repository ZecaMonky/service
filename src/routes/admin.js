const express = require('express');
const router = express.Router();
const { query, get, run } = require('../config/database');
const { isAdmin } = require('../middleware/auth');
const { upload, logUpload, handleUploadError, getFileUrl } = require('../middleware/upload');

// Главная страница админ-панели
router.get('/', isAdmin, async (req, res) => {
    try {
        const [usersResult, productsResult, repairRequestsResult, ordersResult] = await Promise.all([
            query('SELECT * FROM users'),
            query('SELECT * FROM products'),
            query('SELECT * FROM repair_requests ORDER BY created_at DESC LIMIT 5'),
            query('SELECT * FROM shop_orders ORDER BY created_at DESC LIMIT 5')
        ]);

        res.render('admin/dashboard', {
            title: 'Панель администратора',
            users: usersResult.rows || [],
            products: productsResult.rows || [],
            repairRequests: repairRequestsResult.rows || [],
            orders: ordersResult.rows || []
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
        const result = await query('SELECT * FROM users');
        res.render('admin/users', {
            title: 'Управление пользователями',
            users: result.rows || [],
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
        const result = await query('SELECT * FROM products');
        res.render('admin/products', {
            title: 'Управление товарами',
            products: result.rows || [],
            user: req.session.user
        });
    } catch (error) {
        console.error('Ошибка при загрузке списка товаров:', error);
        req.flash('error', 'Произошла ошибка при загрузке списка товаров');
        res.redirect('/admin');
    }
});

// Добавление товара
router.post('/products', isAdmin, logUpload, upload.single('image'), handleUploadError, async (req, res) => {
    // Диагностический лог
    console.log('--- Загрузка товара ---');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    console.log('req.files:', req.files);
    if (!req.file) {
        console.log('Файл не был загружен!');
    }
    try {
        const { name, category, description, price, stock, is_hidden, is_available } = req.body;
        let imagePath = null;

        if (req.file) {
            imagePath = getFileUrl(req.file);
            console.log('Cloudinary file:', req.file);
            console.log('Image path:', imagePath);
        } else {
            console.log('Файл не был загружен!');
        }

        await run(
            'INSERT INTO products (name, category, description, price, stock, image, is_hidden, is_available) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
            [name, category, description, price, stock, imagePath, is_hidden, is_available]
        );
        req.flash('success', 'Товар успешно добавлен');
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Ошибка при добавлении товара:', error);
        req.flash('error', 'Произошла ошибка при добавлении товара: ' + error.message);
        res.redirect('/admin/products');
    }
});

// Страница добавления нового товара
router.get('/products/new', isAdmin, (req, res) => {
    res.render('admin/product-form', { product: null });
});

// Редактирование товара
router.post('/products/:id', isAdmin, upload.single('image'), handleUploadError, async (req, res) => {
    // Диагностический лог
    console.log('--- Обновление товара ---');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    console.log('req.files:', req.files);
    if (!req.file) {
        console.log('Файл не был загружен при обновлении!');
    }
    try {
        const { name, category, description, price, stock, is_hidden, is_available } = req.body;
        const productId = req.params.id;
        let imagePath = null;

        const existingProduct = await get('SELECT image FROM products WHERE id = $1', [productId]);

        if (req.file) {
            imagePath = getFileUrl(req.file);
            console.log('Cloudinary file (update):', req.file);
            console.log('Image path (update):', imagePath);
        } else {
            imagePath = existingProduct ? existingProduct.image : null;
            console.log('Файл не был загружен при обновлении!');
        }

        await run(
            'UPDATE products SET name = $1, category = $2, description = $3, price = $4, stock = $5, image = $6, is_hidden = $7, is_available = $8 WHERE id = $9',
            [name, category, description, price, stock, imagePath, is_hidden, is_available, productId]
        );
        req.flash('success', 'Товар успешно обновлен');
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Ошибка при обновлении товара:', error);
        req.flash('error', 'Ошибка при обновлении товара: ' + error.message);
        res.redirect('/admin/products');
    }
});

// Удаление товара
router.delete('/products/:id', isAdmin, async (req, res) => {
    try {
        await run('DELETE FROM order_items WHERE product_id = $1', [req.params.id]);
        await run('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка при удалении товара:', error);
        res.status(500).json({ success: false, error: 'Ошибка при удалении товара' });
    }
});

// Управление заявками на ремонт
router.get('/repairs', isAdmin, async (req, res) => {
    try {
        const result = await query(`
            SELECT r.*, u.name as user_name, u.email as user_email 
            FROM repair_requests r 
            JOIN users u ON r.user_id = u.id 
            ORDER BY r.created_at DESC
        `);
        res.render('admin/repairs', {
            title: 'Управление заявками на ремонт',
            repairs: result.rows || [],
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
            'UPDATE repair_requests SET status = $1 WHERE id = $2',
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
        const result = await query(`
            SELECT o.*, u.name as user_name, u.email as user_email 
            FROM shop_orders o 
            JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC
        `);
        res.render('admin/orders', {
            title: 'Управление заказами',
            orders: result.rows || [],
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
            'UPDATE shop_orders SET status = $1 WHERE id = $2',
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
        await run('DELETE FROM users WHERE id = $1', [req.params.id]);
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
            'UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4',
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
        await run('DELETE FROM repair_requests WHERE id = $1', [req.params.id]);
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
            'UPDATE repair_requests SET status = $1, comment = $2 WHERE id = $3',
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
        await run('DELETE FROM shop_orders WHERE id = $1', [req.params.id]);
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
            'UPDATE shop_orders SET status = $1 WHERE id = $2',
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
        const user = await get('SELECT * FROM users WHERE id = $1', [req.params.id]);
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
        const product = await get('SELECT * FROM products WHERE id = $1', [req.params.id]);
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
            WHERE r.id = $1
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
                   STRING_AGG(p.name, ',') as product_names,
                   STRING_AGG(oi.quantity::text, ',') as quantities,
                   STRING_AGG(oi.price::text, ',') as prices
            FROM shop_orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.id = $1
            GROUP BY o.id, u.name
        `, [req.params.id]);
        
        if (!order) {
            req.flash('error', 'Заказ не найден');
            return res.redirect('/admin/orders');
        }
        
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

// Обновление телефона в заявке на ремонт
router.put('/repairs/:id/phone', isAdmin, async (req, res) => {
    try {
        const { phone } = req.body;
        const repairId = req.params.id;

        // Проверяем формат телефона
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length !== 11 || !/^[78]/.test(cleanPhone)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Неверный формат номера телефона' 
            });
        }

        await run(
            'UPDATE repair_requests SET contact_phone = $1 WHERE id = $2',
            [phone, repairId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка при обновлении телефона:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при обновлении телефона' 
        });
    }
});

// Обновление is_hidden
router.post('/products/:id/hidden', isAdmin, async (req, res) => {
    try {
        await run('UPDATE products SET is_hidden = $1 WHERE id = $2', [req.body.is_hidden, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Обновление is_available
router.post('/products/:id/available', isAdmin, async (req, res) => {
    try {
        await run('UPDATE products SET is_available = $1 WHERE id = $2', [req.body.is_available, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

module.exports = router; 