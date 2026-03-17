# AI Content Agent - Production Monorepo

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9+-orange.svg)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-latest-red.svg)](https://turbo.build/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Transform videos and photos into engaging social media content. Upload to Telegram → AI conversation → Get YouTube Shorts + Facebook posts ready to publish.

## 🎯 MVP Product

Upload media to Telegram bot → Agent asks questions about your intent and audience → System generates:
- **YouTube Short** (title, description, hashtags)
- **Facebook post** (text, hashtags)

Approve or revise → Publish to both platforms instantly.

**Focus**: YouTube Shorts + Facebook. Session-based workflow. Real user media.

## 🏗️ Architecture

```
ai-content-agent/
├── apps/                      # Runnable services
│   ├── telegram-bot/         # Telegram bot interface
│   ├── api/                  # REST API
│   ├── worker-analysis/      # Content analysis worker
│   ├── worker-generation/    # Content generation worker
│   ├── worker-render/        # Media rendering worker
│   └── worker-publish/       # Publishing worker
│
└── packages/                  # Shared libraries
    ├── core/                 # Core types, errors, constants
    ├── database/             # Prisma + database layer
    ├── queue/                # BullMQ queue abstraction
    ├── storage/              # S3-compatible storage
    ├── ai/                   # AI provider integrations
    ├── media/                # Media processing utilities
    ├── publishing/           # Social platform publishers
    ├── observability/        # Logging, metrics, tracing
    ├── config/               # Configuration management
    └── utils/                # Shared utilities
```

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL
- Redis
- S3-compatible storage (AWS S3, MinIO, etc.)

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Build all packages
pnpm build
```

### Development

```bash
# Run all services in development mode
pnpm dev

# Run specific service
pnpm --filter @ai-agent/telegram-bot dev
pnpm --filter @ai-agent/api dev
pnpm --filter @ai-agent/worker-analysis dev

# Type check
pnpm type-check

# Lint
pnpm lint

# Format
pnpm format
```

## 📦 Apps

### Telegram Bot (`apps/telegram-bot`)

Telegram interface for user interactions. Handles:
- User commands
- Content creation requests
- Status updates
- Publishing management

**Thin handler pattern**: All business logic delegated to services in `packages/`.

### API (`apps/api`)

REST API for programmatic access. Provides:
- Content CRUD operations
- Job status queries
- Webhook endpoints
- Analytics

**Thin controller pattern**: Controllers stay minimal, logic in services.

### Worker: Analysis (`apps/worker-analysis`)

Analyzes user requests and extracts:
- Content type
- Target platforms
- Tone and style
- Topics and hashtags

### Worker: Generation (`apps/worker-generation`)

Generates content using AI:
- Text generation
- Image prompt creation
- Platform optimization

### Worker: Render (`apps/worker-render`)

**Only place for rendering logic**. Handles:
- Image generation
- Video rendering
- Template application
- Media optimization

### Worker: Publish (`apps/worker-publish`)

**Only place for publishing logic**. Manages:
- Platform-specific publishing
- Scheduling
- Retry logic
- Success/failure tracking

## 📚 Packages

### Core (`packages/core`)

Shared types, errors, and constants used across all services.

### Database (`packages/database`)

Prisma-based database layer:
- Models
- Migrations
- Query builders
- Type-safe DB access

### Queue (`packages/queue`)

BullMQ abstraction for async job processing:
- Job enqueueing
- Worker registration
- Progress tracking
- Retry policies

### Storage (`packages/storage`)

S3-compatible storage abstraction:
- File uploads
- Presigned URLs
- Public/private buckets

### AI (`packages/ai`)

AI provider integrations:
- OpenAI
- Anthropic
- Prompt management (files in `src/prompts/`)
- Response parsing

**Prompts are stored in dedicated `.prompt.md` files**

### Media (`packages/media`)

Media processing utilities:
- Image optimization
- Format conversion
- Validation
- Metadata extraction

### Publishing (`packages/publishing`)

**Platform integrations isolated behind interfaces**:
- Twitter
- Instagram
- Facebook
- LinkedIn
- TikTok
- YouTube

Each platform implements `IPublisher` interface.

### Observability (`packages/observability`)

Logging, metrics, and tracing:
- Structured logging (Pino)
- OpenTelemetry integration
- Performance monitoring

### Config (`packages/config`)

Environment-based configuration:
- Zod schema validation
- Type-safe config access
- Environment-specific overrides

### Utils (`packages/utils`)

Shared utility functions:
- Date/time helpers
- String formatting
- Validation helpers

## 🔄 Data Flow

```
User Request (Telegram/API)
         ↓
    [Analysis Worker]
         ↓
   [Generation Worker]
         ↓
    [Render Worker]
         ↓
   [Publish Worker]
         ↓
   Social Platforms
```

## 🎯 Design Principles

1. **Separation of Concerns**
   - Apps handle I/O and orchestration
   - Packages contain business logic
   - Services are composable

2. **Thin Controllers/Handlers**
   - Telegram handlers: validate, enqueue, respond
   - API controllers: validate, call service, return
   - No business logic in apps

3. **Async Processing**
   - Long-running tasks via queues
   - No blocking operations in user-facing apps
   - Retry and failure handling

4. **Isolated Integrations**
   - Platform publishers behind interfaces
   - Easy to add new platforms
   - Testable without real API calls

5. **Scalability**
   - Workers scale independently
   - Stateless services
   - Queue-based communication

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Test specific package
pnpm --filter @ai-agent/core test

# Test with coverage
pnpm test -- --coverage
```

## 🚢 Deployment

Each app can be deployed independently:

```bash
# Build production bundles
pnpm build

# Deploy telegram-bot
cd apps/telegram-bot && node dist/index.js

# Deploy API
cd apps/api && node dist/index.js

# Deploy workers
cd apps/worker-analysis && node dist/index.js
cd apps/worker-generation && node dist/index.js
cd apps/worker-render && node dist/index.js
cd apps/worker-publish && node dist/index.js
```

Recommended: Deploy workers as separate processes/containers for independent scaling.

## 📖 Documentation

- [Agent Instructions](./AGENT_INSTRUCTIONS.md) - For AI coding assistants
- [Architecture Decisions](./docs/architecture.md)
- [API Reference](./docs/api-reference.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Run `pnpm type-check && pnpm lint`
4. Submit PR

## 📄 License

MIT
