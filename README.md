# SSO Identity Provider

Провайдер идентификации (IdP) на базе JWT с OTP-верификацией по email, ротацией refresh-токенов и управлением сессиями.

## Стек

**Бэкенд** — Node.js · Express · TypeScript · Prisma · PostgreSQL · Redis (опционально)

**Фронтенд** — Vue 3 · TypeScript · Vite · Pinia

## Требования

- Node.js >= 18
- PostgreSQL >= 14
- Redis >= 6 (опционально — для распределённого rate limiting)

## Установка

### Бэкенд

```bash
cd backend
npm install
```

Создайте `backend/.env` на основе `backend/.env.example`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/sso_idp"

JWT_SECRET=сгенерируйте-через-openssl-rand-hex-64
JWT_REFRESH_SECRET=сгенерируйте-через-openssl-rand-hex-64

SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=you@yandex.ru
SMTP_PASSWORD=пароль_приложения
```

Применить миграции и создать администратора:

```bash
npx prisma migrate deploy
npm run seed
```

### Фронтенд

```bash
cd frontend
npm install
```

## Запуск

```bash
# Бэкенд (с горячей перезагрузкой)
cd backend && npm run dev

# Фронтенд
cd frontend && npm run dev
```

Бэкенд: `http://localhost:3000` · Фронтенд: `http://localhost:5173`

## API

### Аутентификация

| Метод | Путь | Токен | Описание |
|-------|------|-------|----------|
| POST | `/auth/register` | — | Регистрация пользователя |
| POST | `/auth/otp` | — | Запрос OTP (отправляется на email) |
| POST | `/auth/verify-otp` | — | Подтверждение OTP → выдача токенов |
| POST | `/auth/login` | — | Вход по паролю → выдача токенов |
| POST | `/auth/refresh` | cookie | Ротация refresh-токена |
| POST | `/auth/logout` | cookie | Отзыв текущей сессии |
| POST | `/auth/logout-all` | Bearer | Отзыв всех сессий и инвалидация токенов |
| GET | `/auth/profile` | Bearer | Профиль текущего пользователя |
| PATCH | `/auth/profile` | Bearer | Обновление профиля (displayName) |
| POST | `/auth/change-password` | Bearer | Смена пароля |
| POST | `/auth/reset-password` | — | Сброс пароля по OTP |

### Сессии

| Метод | Путь | Токен | Описание |
|-------|------|-------|----------|
| GET | `/sessions` | Bearer | Список сессий (фильтр, пагинация) |
| GET | `/sessions/:id` | Bearer | Детали сессии |
| DELETE | `/sessions/:id` | Bearer | Отзыв сессии |

### Администрирование

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/admin/users` | Список пользователей (поиск, пагинация) |
| POST | `/admin/users/:id/lock` | Блокировка пользователя |
| POST | `/admin/users/:id/unlock` | Разблокировка пользователя |
| GET | `/admin/audit-logs` | Журнал событий (фильтр, пагинация) |

> Refresh-токен передаётся через httpOnly cookie, а не в теле запроса.

## CLI

```bash
cd backend

# Управление пользователями
npm run cli -- user:list
npm run cli -- user:get admin@example.com
npm run cli -- user:verify user@example.com
npm run cli -- user:revoke user@example.com   # инвалидирует все токены
npm run cli -- user:delete user@example.com

# Управление сессиями
npm run cli -- session:list user@example.com
npm run cli -- session:revoke <session-id>

# Обслуживание
npm run cli -- otp:purge   # удалить истёкшие и использованные OTP
npm run cli -- stats        # общая статистика по системе
```

## Сквозной тест

Запускает полный цикл: регистрация → OTP → верификация → вход → ротация токена → повтор (отказ) → выход.

```bash
cd backend
chmod +x test-flow.sh
./test-flow.sh
```

Требует: `curl`, `jq`. Сервер должен быть запущен в режиме разработки (`NODE_ENV != production`).

## Prisma

| Ситуация | Команда |
|----------|---------|
| Обновить клиент после изменения схемы | `npx prisma generate` |
| Создать и применить новую миграцию | `npx prisma migrate dev --name <название>` |
| Применить миграции (прод / CI) | `npx prisma migrate deploy` |
| Полный сброс БД | `npx prisma migrate reset` |
| Статус миграций | `npx prisma migrate status` |
| Открыть Prisma Studio | `npx prisma studio` |

## Тесты

```bash
# Бэкенд
cd backend && npm test

# Фронтенд
cd frontend && npm test
```
