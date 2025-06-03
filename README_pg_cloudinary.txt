# Сервисный центр — Node.js + PostgreSQL + Cloudinary

Веб-приложение для сервисного центра с поддержкой загрузки изображений в Cloudinary и хранением данных в PostgreSQL.

---

## Основные технологии
- Node.js, Express
- PostgreSQL (через pg)
- Cloudinary (через multer-storage-cloudinary)
- EJS (шаблонизатор)
- Сессии через connect-pg-simple

---

## Быстрый старт

1. **Клонируйте репозиторий:**
   ```bash
   git clone <ваш-репозиторий>
   cd <ваша-папка>
   ```

2. **Установите зависимости:**
   ```bash
   npm install
   ```

3. **Создайте файл `.env` и укажите переменные:**
   ```env
   DATABASE_URL=postgres://user:password@host:port/dbname
   SESSION_SECRET=your-session-secret
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   NODE_ENV=development
   PORT=3000
   ```

4. **Создайте таблицы в PostgreSQL:**
   (Пример SQL — см. файл `migrations.sql` или ниже)

5. **Запустите приложение:**
   ```bash
   npm run dev
   # или для продакшена
   npm start
   ```

---

## Пример SQL для создания таблиц

```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    category TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_amount NUMERIC(10,2) NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    comment TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS repair_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_type TEXT NOT NULL,
    device_model TEXT NOT NULL,
    issue TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  PRIMARY KEY ("sid")
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
```

---

## Загрузка изображений
- Все изображения товаров загружаются напрямую в Cloudinary.
- В базе хранится только ссылка на изображение.

---

## Запуск на Render.com
- Укажите переменные окружения в настройках Render.
- В файле `render.yaml` уже прописаны основные параметры.

---

## Полезные команды
- `npm run dev` — запуск в режиме разработки
- `npm start` — запуск в продакшене

---

## Контакты
- Вопросы и предложения: [ваш email или github] 