# Quick Start - Мінімальний Запуск

## Крок 1: Отримати Gemini API Key

1. Відкрий https://aistudio.google.com/apikey
2. Натисни **Get API key** → **Create API key**
3. Скопіюй ключ

## Крок 2: Створити Telegram Бота

1. Напиши [@BotFather](https://t.me/BotFather) в Telegram
2. Відправ `/newbot`
3. Введи назву (наприклад: AI Content Agent Test)
4. Введи username (наприклад: `my_ai_content_bot`)
5. Скопіюй токен (виглядає як `123456789:ABCdefGHI...`)

## Крок 3: Додати в .env

```bash
# Відкрий .env файл
cd /home/kos/.openclaw/workspace-main/ai-content-agent
nano .env

# Додай ці 2 рядки (замість ... вставити свої значення):
GOOGLE_AI_API_KEY=AIzaSy...твій-ключ
TELEGRAM_BOT_TOKEN=123456789:ABC...твій-токен
```

## Крок 4: Запустити Docker Сервіси

```bash
docker compose -f docker-compose.dev.yml up -d

# Перевірка:
docker ps
# Повинні бути: postgres, redis, minio
```

## Крок 5: Запустити API + Workers

```bash
# Термінал 1: API Server
node apps/api/dist/index.js

# Термінал 2: Telegram Bot
node apps/telegram-bot/dist/index.js

# Термінал 3: Worker Analysis
node apps/worker-analysis/dist/index.js

# Термінал 4: Worker Generation
node apps/worker-generation/dist/index.js

# Термінал 5: Worker Publish (опційно, без OAuth)
node apps/worker-publish/dist/index.js
```

## Крок 6: Тест

1. Відкрий свого бота в Telegram
2. Відправ `/start`
3. Завантаж відео або фото
4. Дочекайся AI аналізу
5. Відповідай на питання
6. Отримай згенеровані драфти

**Що працює:**
- ✅ Завантаження медіа
- ✅ AI аналіз
- ✅ Генерація контенту
- ✅ Редагування драфтів

**Що НЕ працює (без OAuth):**
- ❌ Публікація в YouTube
- ❌ Публікація в Facebook

---

## Для Повної Публікації

Додатково потрібно:

### YouTube
```bash
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
```
Отримати: https://console.cloud.google.com/

### Facebook
```bash
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
```
Отримати: https://developers.facebook.com/

---

## Troubleshooting

### Помилка: "Cannot find module '@ai-agent/...'"
```bash
pnpm install --ignore-scripts
pnpm build
```

### Помилка: "Database connection failed"
```bash
# Перевір що Docker сервіси запущені:
docker ps

# Якщо ні - запусти:
docker compose -f docker-compose.dev.yml up -d
```

### Помилка: "Gemini API key is required"
```bash
# Перевір що .env містить ключ:
grep GOOGLE_AI_API_KEY .env

# Якщо порожнє - додай свій ключ
```

### Бот не відповідає
```bash
# Перевір логи telegram-bot:
# В терміналі де запущено telegram-bot повинні бути логи
# Якщо нічого - перевір TELEGRAM_BOT_TOKEN в .env
```

---

## Діагностика

```bash
# Перевірка що сервіси слухають на портах:
netstat -tlnp | grep -E '3000|5433|6380|9000'

# Перевірка логів Docker:
docker logs ai-agent-postgres
docker logs ai-agent-redis
docker logs ai-agent-minio

# Перевірка БД:
psql postgresql://ai_agent:dev_password_123@localhost:5433/ai_content_agent -c "\dt"
```

---

**Після цього кроку можеш тестувати основний флоу без публікації!**
