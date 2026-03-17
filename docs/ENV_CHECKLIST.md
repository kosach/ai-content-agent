# Environment Variables Checklist

## 📋 Базова Конфігурація (вже готово ✅)

- ✅ `DATABASE_URL` - PostgreSQL (localhost:5433)
- ✅ `REDIS_HOST/PORT` - Redis (localhost:6380)
- ✅ `S3_ENDPOINT/BUCKET/ACCESS_KEY/SECRET_KEY` - MinIO (localhost:9000)
- ✅ `API_PORT` - API Server (3000)
- ✅ `NODE_ENV` - development

**Ці змінні вже налаштовані в .env і працюють з Docker.**

---

## 🔴 Критично Необхідні (БЕЗ НИХ НЕ ЗАПУСТИТЬСЯ)

### 1. Gemini API (AI аналіз і генерація)
```bash
GOOGLE_AI_API_KEY=  # ❌ ПОТРІБНО
```
**Статус:** ❌ Відсутній  
**Де взяти:** https://aistudio.google.com/apikey  
**Час:** 2 хвилини  
**Безкоштовно:** Так (60 requests/min)

### 2. Telegram Bot Token
```bash
TELEGRAM_BOT_TOKEN=  # ❌ ПОТРІБНО
```
**Статус:** ❌ Відсутній  
**Де взяти:** @BotFather в Telegram  
**Час:** 3 хвилини  
**Безкоштовно:** Так

---

## ⚠️ Для MVP Публікації (опційно для початку)

### 3. YouTube OAuth
```bash
YOUTUBE_CLIENT_ID=       # ❌ ПОТРІБНО для публікації
YOUTUBE_CLIENT_SECRET=   # ❌ ПОТРІБНО для публікації
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/oauth/youtube/callback  # ✅ Вже є
```
**Статус:** ❌ Відсутні Client ID/Secret  
**Де взяти:** https://console.cloud.google.com/  
**Час:** 10-15 хвилин  
**Складність:** Середня

**Кроки:**
1. Create/Select Project
2. Enable YouTube Data API v3
3. Create OAuth 2.0 credentials
4. Add redirect URI: `http://localhost:3000/api/oauth/youtube/callback`
5. Copy Client ID + Client Secret

### 4. Facebook OAuth
```bash
FACEBOOK_APP_ID=         # ❌ ПОТРІБНО для публікації
FACEBOOK_APP_SECRET=     # ❌ ПОТРІБНО для публікації
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/oauth/facebook/callback  # ✅ Вже є
```
**Статус:** ❌ Відсутні App ID/Secret  
**Де взяти:** https://developers.facebook.com/  
**Час:** 10-15 хвилин  
**Складність:** Середня

**Кроки:**
1. Create App (Business type)
2. Add Facebook Login product
3. Copy App ID + App Secret
4. Add redirect URI: `http://localhost:3000/api/oauth/facebook/callback`

---

## 🟢 Опційні (не обов'язкові)

### OpenAI
```bash
OPENAI_API_KEY=  # Опційно (не використовується в MVP)
```

### Anthropic
```bash
ANTHROPIC_API_KEY=  # Опційно (не використовується в MVP)
```

### Observability
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=  # Опційно (для metrics/traces)
```

---

## 🎯 Рекомендований План Дій

### Етап 1: Мінімальний Тест (5 хвилин)
**Мета:** Перевірити що build працює, база підключена, AI відповідає

**Потрібно:**
- ✅ DATABASE_URL (вже є)
- ✅ REDIS (вже є)
- ✅ S3 (вже є)
- ❌ `GOOGLE_AI_API_KEY` ← **отримати зараз**
- ❌ `TELEGRAM_BOT_TOKEN` ← **отримати зараз**

**Що працює:**
- Telegram бот приймає медіа
- AI аналізує відео/фото
- Генеруються драфти
- Можна редагувати

**Що НЕ працює:**
- Публікація (worker-publish впаде, але це ОК)

---

### Етап 2: Повний MVP (30 хвилин)
**Мета:** End-to-end тест з реальною публікацією

**Додатково потрібно:**
- ❌ `YOUTUBE_CLIENT_ID` + `YOUTUBE_CLIENT_SECRET`
- ❌ `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET`

**Що працює:**
- ВСЕ включно з публікацією в YouTube Shorts + Facebook

---

## 📊 Поточний Статус

| Компонент | Змінна | Статус |
|-----------|--------|--------|
| Database | `DATABASE_URL` | ✅ Готово |
| Redis | `REDIS_HOST/PORT` | ✅ Готово |
| S3 Storage | `S3_*` | ✅ Готово |
| **Gemini AI** | `GOOGLE_AI_API_KEY` | ❌ **Потрібно** |
| **Telegram** | `TELEGRAM_BOT_TOKEN` | ❌ **Потрібно** |
| YouTube | `YOUTUBE_CLIENT_*` | ⚠️ Для публікації |
| Facebook | `FACEBOOK_APP_*` | ⚠️ Для публікації |

---

## ✅ Next Step

**Для початку тестування потрібно лише 2 речі:**

1. **Gemini API Key** (2 хв) → https://aistudio.google.com/apikey
2. **Telegram Bot Token** (3 хв) → @BotFather

Після цього можеш запускати і тестувати основний флоу!

---

## 🔗 Корисні Посилання

- **Gemini API:** https://aistudio.google.com/apikey
- **Telegram BotFather:** https://t.me/BotFather
- **Google Cloud Console:** https://console.cloud.google.com/
- **Meta Developers:** https://developers.facebook.com/
- **YouTube Data API Docs:** https://developers.google.com/youtube/v3
- **Facebook Graph API Docs:** https://developers.facebook.com/docs/graph-api

---

**Детальні інструкції:** Дивись `QUICK_START.md`
