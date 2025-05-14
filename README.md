# Сервисный центр — Node.js + PostgreSQL + Cloudinary

Веб-приложение для сервисного центра с поддержкой загрузки изображений в Cloudinary и хранением данных в PostgreSQL.

---

## Содержание

- [Описание](#описание)
- [Архитектура и стек](#архитектура-и-стек)
- [Структура проекта](#структура-проекта)
- [Установка и запуск](#установка-и-запуск)
- [Переменные окружения](#переменные-окружения)
- [Миграции и структура БД](#миграции-и-структура-бд)
- [Работа с изображениями (Cloudinary)](#работа-с-изображениями-cloudinary)
- [Деплой на Render.com](#деплой-на-rendercom)
- [Тестирование](#тестирование)
- [Полезные команды](#полезные-команды)
- [FAQ и отладка](#faq-и-отладка)
- [Контакты](#контакты)

---

## Описание

Это современное веб-приложение для сервисного центра, позволяющее:
- Управлять пользователями, товарами, заказами и заявками на ремонт.
- Хранить данные в PostgreSQL.
- Загружать изображения товаров напрямую в облако Cloudinary.
- Использовать сессии через PostgreSQL (connect-pg-simple).
- Иметь удобную админ-панель и клиентский интерфейс.

---

## Архитектура и стек

- **Node.js** — серверная логика
- **Express** — роутинг и middleware
- **PostgreSQL** — основная база данных
- **pg** — драйвер для работы с PostgreSQL
- **Cloudinary** — хранение изображений
- **multer-storage-cloudinary** — загрузка файлов в Cloudinary
- **EJS** — шаблонизатор для рендеринга страниц
- **express-session + connect-pg-simple** — сессии через PostgreSQL
- **Bootstrap 5** — стилизация интерфейса

---

## Структура проекта

```
project-root/
│
├── src/
│   ├── app.js                # основной файл приложения
│   ├── config/
│   │   └── database.js       # подключение к PostgreSQL
│   ├── middleware/
│   │   ├── upload.js         # загрузка файлов в Cloudinary
│   │   ├── auth.js           # авторизация и права
│   │   └── ...               # другие middleware
│   ├── routes/
│   │   ├── main.js
│   │   ├── admin.js
│   │   ├── shop.js
│   │   ├── repair.js
│   │   └── auth.js
│   ├── views/                # EJS-шаблоны
│   └── public/               # статика (css, js, картинки)
│
├── .env                      # переменные окружения (не коммитить!)
├── package.json
├── render.yaml               # деплой на Render.com
└── README.md
```

---

## Установка и запуск

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
   - Используйте SQL из раздела ниже или файл `migrations.sql`.

5. **Запустите приложение:**
   ```bash
   npm run dev
   # или для продакшена
   npm start
   ```

---

## Переменные окружения

- `DATABASE_URL` — строка подключения к PostgreSQL
- `SESSION_SECRET` — секрет для сессий
- `CLOUDINARY_CLOUD_NAME` — имя облака Cloudinary
- `CLOUDINARY_API_KEY` — API-ключ Cloudinary
- `CLOUDINARY_API_SECRET` — API-секрет Cloudinary
- `NODE_ENV` — окружение (`development` или `production`)
- `PORT` — порт сервера

---

## Миграции и структура БД

**Пример SQL для создания таблиц:**

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

## Работа с изображениями (Cloudinary)

- Все изображения товаров загружаются напрямую в Cloudinary через Multer.
- В базе хранится только ссылка на изображение.
- Для загрузки требуется корректно настроить переменные Cloudinary в `.env`.

---

## Деплой на Render.com

- В файле `render.yaml` уже прописаны основные параметры.
- Укажите переменные окружения в настройках Render.
- Для деплоя достаточно запушить изменения в репозиторий.

---

## Тестирование

- Для тестирования можно использовать Jest, Supertest, Selenium.
- Пример теста авторизации (Jest):
  ```js
  test('Авторизация администратора', async () => {
      const response = await request(app).post('/login').send({
          email: 'admin@example.com',
          password: 'admin123'
      });
      expect(response.statusCode).toBe(302);
  });
  ```
- UI-тесты можно писать на Selenium или Playwright.

---

## Полезные команды

- `npm run dev` — запуск в режиме разработки (nodemon)
- `npm start` — запуск в продакшене
- `npm test` — запуск тестов (если настроены)

---

## FAQ и отладка

- **Ошибка подключения к БД:** Проверьте строку подключения и доступность PostgreSQL.
- **Не загружаются изображения:** Проверьте переменные Cloudinary и лимиты аккаунта.
- **Сессии не работают:** Убедитесь, что таблица `session` создана, а секрет указан.
- **Проблемы с деплоем:** Проверьте логи Render.com и переменные окружения.

---

## Контакты

- Вопросы и предложения: [ваш email или github]

---

Если нужно добавить ещё больше подробностей (например, примеры API, описание роутов, схемы E-R, примеры миграций, CI/CD и т.д.) — напишите, и я расширю README!
