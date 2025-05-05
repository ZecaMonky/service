const express = require('express');
const router = express.Router();
const { query, get, run } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// Маршрут для корзины
router.get('/cart', isAuthenticated, async (req, res) => {
    try {
        const cart = req.session.cart || [];
        
        // Получаем актуальные данные о товарах
        if (cart.length > 0) {
            const productIds = cart.map(item => item.product_id);
            const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
            const products = await query(
                `SELECT * FROM products WHERE id IN (${placeholders})`,
                productIds
            );

            // Обновляем данные в корзине
            const updatedCart = cart.map(item => {
                const product = products.find(p => p.id === item.product_id);
                return {
                    ...item,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    category: product.category
                };
            });
            req.session.cart = updatedCart;
        }
        
        res.render('shop/cart', {
            title: 'Корзина',
            cart: cart || [],
            user: req.session.user
        });
    } catch (error) {
        console.error('Ошибка при загрузке корзины:', error);
        req.flash('error', 'Произошла ошибка при загрузке корзины');
        res.redirect('/shop');
    }
});

// Страница каталога
router.get('/', async (req, res) => {
    try {
        const { category, minPrice, maxPrice, sort, page = 1 } = req.query;
        const itemsPerPage = 9;
        const offset = (page - 1) * itemsPerPage;
        
        let queryStr = 'SELECT * FROM products WHERE 1=1';
        const params = [];
        
        if (category) {
            queryStr += ` AND category = $${params.length + 1}`;
            params.push(category);
        }
        
        if (minPrice) {
            queryStr += ` AND price >= $${params.length + 1}`;
            params.push(minPrice);
        }
        
        if (maxPrice) {
            queryStr += ` AND price <= $${params.length + 1}`;
            params.push(maxPrice);
        }
        
        if (sort) {
            switch (sort) {
                case 'price_asc':
                    queryStr += ' ORDER BY price ASC';
                    break;
                case 'price_desc':
                    queryStr += ' ORDER BY price DESC';
                    break;
                case 'name_asc':
                    queryStr += ' ORDER BY name ASC';
                    break;
                case 'name_desc':
                    queryStr += ' ORDER BY name DESC';
                    break;
            }
        }

        // Получаем общее количество товаров
        const countQuery = queryStr.replace('SELECT *', 'SELECT COUNT(*) as count');
        const countResult = await get(countQuery, params);
        const totalItems = countResult.count;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        // Добавляем пагинацию к основному запросу
        queryStr += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(itemsPerPage, offset);
        
        const products = await query(queryStr, params);
        const categories = await query('SELECT DISTINCT category FROM products');
        
        res.render('shop/catalog', {
            title: 'Каталог товаров',
            products: products || [],
            categories: categories.rows.map(c => c.category) || [],
            selectedCategory: category,
            minPrice,
            maxPrice,
            sort,
            currentPage: parseInt(page),
            totalPages,
            user: req.session.user
        });
    } catch (error) {
        console.error('Ошибка при загрузке каталога:', error);
        req.flash('error', 'Произошла ошибка при загрузке каталога');
        res.redirect('/');
    }
});

// Страница товара
router.get('/product/:id', async (req, res) => {
    try {
        const product = await get('SELECT * FROM products WHERE id = $1', [req.params.id]);
        
        if (!product) {
            req.flash('error', 'Товар не найден');
            return res.redirect('/shop');
        }
        
        res.render('shop/product', {
            title: product.name,
            product,
            user: req.session.user
        });
    } catch (error) {
        console.error('Ошибка при загрузке товара:', error);
        req.flash('error', 'Произошла ошибка при загрузке товара');
        res.redirect('/shop');
    }
});

// Добавление товара в корзину
router.post('/cart/add', isAuthenticated, async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const product = await get('SELECT * FROM products WHERE id = $1', [productId]);
        
        if (!product) {
            req.flash('error', 'Товар не найден');
            return res.redirect('/shop');
        }

        if (product.stock < quantity) {
            req.flash('error', 'Недостаточно товара в наличии');
            return res.redirect('/shop');
        }

        // Инициализируем корзину, если она не существует
        if (!req.session.cart) {
            req.session.cart = [];
        }

        // Проверяем, есть ли уже такой товар в корзине
        const existingItemIndex = req.session.cart.findIndex(item => item.product_id === parseInt(productId));
        
        if (existingItemIndex !== -1) {
            // Обновляем количество существующего товара
            req.session.cart[existingItemIndex].quantity += parseInt(quantity);
        } else {
            // Добавляем новый товар
            req.session.cart.push({
                product_id: parseInt(productId),
                quantity: parseInt(quantity),
                name: product.name,
                price: product.price,
                image: product.image,
                category: product.category
            });
        }

        req.flash('success', `Товар "${product.name}" успешно добавлен в корзину`);
        res.redirect('/shop/cart');
    } catch (error) {
        console.error('Ошибка при добавлении товара в корзину:', error);
        req.flash('error', 'Произошла ошибка при добавлении товара в корзину');
        res.redirect('/shop');
    }
});

// Обновление количества товара в корзине
router.post('/cart/update', isAuthenticated, async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const cart = req.session.cart || [];

        const itemIndex = cart.findIndex(item => item.product_id === parseInt(productId));
        if (itemIndex !== -1) {
            cart[itemIndex].quantity = parseInt(quantity);
            req.session.cart = cart;
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка при обновлении количества товара:', error);
        res.json({ success: false, error: 'Ошибка при обновлении количества товара' });
    }
});

// Удаление товара из корзины
router.post('/cart/remove', isAuthenticated, async (req, res) => {
    try {
        const { productId } = req.body;
        if (!productId) {
            return res.json({ success: false, error: 'Не указан ID товара' });
        }

        const cart = req.session.cart || [];
        const updatedCart = cart.filter(item => item.product_id !== parseInt(productId));
        req.session.cart = updatedCart;

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка при удалении товара из корзины:', error);
        res.json({ success: false, error: 'Ошибка при удалении товара из корзины' });
    }
});

// Получение количества товаров в корзине
router.get('/cart/count', isAuthenticated, async (req, res) => {
    try {
        const cart = req.session.cart || [];
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        res.json({ success: true, count });
    } catch (error) {
        console.error('Ошибка при получении количества товаров в корзине:', error);
        res.json({ success: false, count: 0, error: 'Ошибка при получении количества товаров в корзине' });
    }
});

// Оформление заказа (GET)
router.get('/checkout', isAuthenticated, async (req, res) => {
    try {
        const cart = req.session.cart || [];
        if (cart.length === 0) {
            req.flash('error', 'Корзина пуста');
            return res.redirect('/shop/cart');
        }

        // Получаем актуальные данные о товарах
        const productIds = cart.map(item => item.product_id);
        const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
        const products = await query(
            `SELECT * FROM products WHERE id IN (${placeholders})`,
            productIds
        );

        // Обновляем данные в корзине
        const updatedCart = cart.map(item => {
            const product = products.find(p => p.id === item.product_id);
            return {
                ...item,
                name: product.name,
                price: product.price,
                image: product.image,
                category: product.category
            };
        });

        res.render('shop/checkout', {
            title: 'Оформление заказа',
            cart: updatedCart,
            total: parseFloat(updatedCart.reduce((sum, item) => sum + item.price * item.quantity, 0)).toFixed(2)
        });
    } catch (error) {
        console.error('Ошибка при оформлении заказа:', error);
        req.flash('error', 'Произошла ошибка при оформлении заказа');
        res.redirect('/shop/cart');
    }
});

// Оформление заказа (POST)
router.post('/checkout', isAuthenticated, async (req, res) => {
    try {
        const { address, phone, comment } = req.body;
        const cart = req.session.cart || [];

        // Проверяем наличие обязательных полей
        if (!address || !phone) {
            req.flash('error', 'Пожалуйста, заполните все обязательные поля');
            return res.redirect('/shop/checkout');
        }

        // Проверяем наличие товаров в корзине
        if (cart.length === 0) {
            req.flash('error', 'Корзина пуста');
            return res.redirect('/shop/cart');
        }

        // Проверяем наличие всех товаров в базе данных
        const productIds = cart.map(item => item.product_id);
        const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
        const products = await query(`SELECT * FROM products WHERE id IN (${placeholders})`, productIds);
        
        if (products.rows.length !== cart.length) {
            req.flash('error', 'Некоторые товары больше не доступны');
            return res.redirect('/shop/cart');
        }

        // Создаем заказ
        const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);
        const result = await run(
            'INSERT INTO shop_orders (user_id, total_amount, address, phone, comment, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [req.session.user.id, totalAmount, address, phone, comment || null, 'pending']
        );
        const orderId = result.rows[0].id;

        // Создаем записи о товарах в заказе
        for (const item of cart) {
            await run(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
                [orderId, item.product_id, item.quantity, item.price]
            );
        }

        // Очищаем корзину
        req.session.cart = [];
        req.flash('success', 'Заказ успешно оформлен');
        res.redirect('/shop/orders');
    } catch (error) {
        console.error('Ошибка при оформлении заказа:', error);
        req.flash('error', 'Произошла ошибка при оформлении заказа');
        res.redirect('/shop/checkout');
    }
});

// Страница заказа
router.get('/order/:id', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    
    try {
        const order = await get('SELECT * FROM shop_orders WHERE id = $1 AND user_id = $2',
            [req.params.id, req.session.user.id]);
            
        if (!order) {
            return res.redirect('/shop');
        }
        
        const items = await query('SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1',
            [order.id]);
        
        res.render('shop/order', {
            title: `Заказ #${order.id}`,
            order,
            items: items || [],
            user: req.session.user
        });
    } catch (error) {
        console.error('Ошибка при загрузке заказа:', error);
        req.flash('error', 'Произошла ошибка при загрузке заказа');
        res.redirect('/shop');
    }
});

// История заказов
router.get('/orders', isAuthenticated, async (req, res) => {
    try {
        const orders = await query(`
            SELECT o.*, 
                   STRING_AGG(p.name, ',') as product_names,
                   STRING_AGG(oi.quantity::text, ',') as quantities,
                   STRING_AGG(oi.price::text, ',') as prices
            FROM shop_orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = $1
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `, [req.session.user.id]);
        
        res.render('shop/orders', {
            title: 'История заказов',
            orders,
            user: req.session.user
        });
    } catch (error) {
        console.error('Ошибка при загрузке истории заказов:', error);
        req.flash('error', 'Произошла ошибка при загрузке истории заказов');
        res.redirect('/shop');
    }
});

module.exports = router; 