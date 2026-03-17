# AI Content Agent

AI-powered Telegram bot for creating YouTube Shorts and Facebook posts from your videos and photos.

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install --ignore-scripts
   ```

2. **Setup environment:**
   ```bash
   cp .env.example .env
   # Add your API keys to .env
   ```

3. **Start services:**
   ```bash
   ./launch-all.sh
   ```

## Features

- 🤖 Natural conversation in Ukrainian and English
- 🎬 AI-powered content analysis with Gemini
- 📝 Automatic draft generation (titles, descriptions, hashtags)
- 🚀 Publishing to YouTube Shorts and Facebook
- 💬 Interactive Telegram interface

## Tech Stack

- **TypeScript** monorepo (Turborepo)
- **Telegram Bot** (telegraf)
- **AI:** Google Gemini 2.5 Flash
- **Queue:** BullMQ + Redis
- **Storage:** MinIO (S3-compatible)
- **Database:** PostgreSQL + Prisma

## Documentation

All documentation is in the `docs/` directory:

- [Quick Start Guide](docs/QUICK_START.md)
- [Environment Setup](docs/ENV_CHECKLIST.md)
- [Architecture](docs/ARCHITECTURE_DECISIONS.md)
- [Build Instructions](docs/BUILD_SUCCESS_REPORT.md)

## Project Structure

```
ai-content-agent/
├── apps/
│   ├── api/                 # REST API server
│   ├── telegram-bot/        # Telegram bot
│   ├── worker-analysis/     # Media analysis worker
│   ├── worker-generation/   # Draft generation worker
│   └── worker-publish/      # Publishing worker
├── packages/
│   ├── ai/                  # AI integration
│   ├── config/              # Configuration
│   ├── database/            # Prisma schema
│   └── ...
└── docs/                    # Documentation
```

## License

MIT

## Author

Andrii Kosach
