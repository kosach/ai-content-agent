# Monorepo Structure

Complete folder structure of the AI Content Agent monorepo:

```
ai-content-agent/
│
├── .env.example                    # Environment variables template
├── .eslintrc.js                    # ESLint configuration
├── .gitignore                      # Git ignore rules
├── .prettierrc                     # Prettier configuration
├── .prettierignore                 # Prettier ignore rules
├── package.json                    # Root package.json (workspace manager)
├── pnpm-workspace.yaml             # pnpm workspace configuration
├── tsconfig.json                   # Root TypeScript config
├── tsconfig.base.json              # Base TypeScript config for packages
├── turbo.json                      # Turbo build system config
├── README.md                       # Project documentation
├── AGENT_INSTRUCTIONS.md           # Instructions for AI coding assistants
└── STRUCTURE.md                    # This file
│
├── apps/                           # Runnable services
│   │
│   ├── telegram-bot/               # Telegram bot interface
│   │   ├── src/
│   │   │   ├── handlers/          # Command handlers (THIN!)
│   │   │   │   └── index.ts
│   │   │   ├── services/          # Service integration
│   │   │   └── index.ts           # Bot entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api/                        # REST API
│   │   ├── src/
│   │   │   ├── controllers/       # Request handlers (THIN!)
│   │   │   ├── routes/            # Route definitions
│   │   │   ├── middleware/        # Express/Fastify middleware
│   │   │   └── index.ts           # API entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── worker-analysis/            # Analysis worker
│   │   ├── src/
│   │   │   ├── jobs/              # Job handlers
│   │   │   │   └── analyze-content.ts
│   │   │   ├── services/          # Business logic
│   │   │   └── index.ts           # Worker entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── worker-generation/          # Generation worker
│   │   ├── src/
│   │   │   ├── jobs/              # Job handlers
│   │   │   ├── services/          # Business logic
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── worker-render/              # ONLY place for rendering
│   │   ├── src/
│   │   │   ├── jobs/              # Rendering jobs
│   │   │   ├── services/          # Rendering services
│   │   │   ├── renderers/         # Renderer implementations
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── worker-publish/             # ONLY place for publishing
│       ├── src/
│       │   ├── jobs/              # Publishing jobs
│       │   ├── services/          # Publisher registry
│       │   ├── publishers/        # Platform-specific (import from packages)
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
└── packages/                       # Shared libraries
    │
    ├── core/                       # Core types and constants
    │   ├── src/
    │   │   ├── types/
    │   │   │   ├── content.ts     # Content types
    │   │   │   ├── job.ts         # Job types
    │   │   │   ├── platform.ts    # Platform types
    │   │   │   ├── user.ts        # User types
    │   │   │   └── index.ts
    │   │   ├── errors/
    │   │   │   └── index.ts       # Custom error classes
    │   │   ├── constants/
    │   │   │   └── index.ts       # App constants
    │   │   └── index.ts
    │   ├── package.json
    │   └── tsconfig.json
    │
    ├── database/                   # Database layer (Prisma)
    │   ├── prisma/
    │   │   ├── schema.prisma      # Database schema
    │   │   ├── migrations/        # Migration files
    │   │   └── seeds/             # Seed data
    │   ├── src/
    │   │   ├── models/            # Model utilities
    │   │   └── index.ts           # Prisma client export
    │   ├── package.json
    │   └── tsconfig.json
    │
    ├── queue/                      # Queue abstraction (BullMQ)
    │   ├── src/
    │   │   ├── queue-manager.ts   # Queue creation/management
    │   │   ├── job-enqueuer.ts    # Job enqueueing
    │   │   └── index.ts
    │   ├── package.json
    │   └── tsconfig.json
    │
    ├── storage/                    # S3-compatible storage
    │   ├── src/
    │   │   ├── storage-client.ts  # S3 client wrapper
    │   │   ├── upload.ts          # Upload utilities
    │   │   ├── download.ts        # Download utilities
    │   │   └── index.ts
    │   ├── package.json
    │   └── tsconfig.json
    │
    ├── ai/                         # AI provider integrations
    │   ├── src/
    │   │   ├── providers/
    │   │   │   ├── openai.ts      # OpenAI provider
    │   │   │   ├── anthropic.ts   # Anthropic provider
    │   │   │   └── index.ts
    │   │   ├── prompts/           # PROMPT FILES (not code!)
    │   │   │   ├── analysis/
    │   │   │   │   └── content-analyzer.prompt.md
    │   │   │   └── generation/
    │   │   │       └── content-generator.prompt.md
    │   │   ├── services/
    │   │   │   ├── analyzer.ts    # Content analysis service
    │   │   │   ├── generator.ts   # Content generation service
    │   │   │   └── prompt-loader.ts
    │   │   └── index.ts
    │   ├── package.json
    │   └── tsconfig.json
    │
    ├── media/                      # Media processing
    │   ├── src/
    │   │   ├── processors/
    │   │   │   ├── image.ts       # Image processing
    │   │   │   ├── video.ts       # Video processing
    │   │   │   └── index.ts
    │   │   ├── validators/
    │   │   │   └── media.ts       # Media validation
    │   │   └── index.ts
    │   ├── package.json
    │   └── tsconfig.json
    │
    ├── publishing/                 # Social platform publishers
    │   ├── src/
    │   │   ├── interfaces/
    │   │   │   └── publisher.interface.ts  # IPublisher interface
    │   │   ├── platforms/         # Platform implementations
    │   │   │   ├── twitter-publisher.ts
    │   │   │   ├── instagram-publisher.ts
    │   │   │   ├── facebook-publisher.ts
    │   │   │   ├── linkedin-publisher.ts
    │   │   │   └── index.ts
    │   │   └── index.ts
    │   ├── package.json
    │   └── tsconfig.json
    │
    ├── observability/              # Logging, metrics, tracing
    │   ├── src/
    │   │   ├── logging/
    │   │   │   ├── logger.ts      # Pino logger setup
    │   │   │   └── index.ts
    │   │   ├── metrics/
    │   │   │   └── index.ts       # Metrics (future)
    │   │   ├── tracing/
    │   │   │   └── index.ts       # OpenTelemetry (future)
    │   │   └── index.ts
    │   ├── package.json
    │   └── tsconfig.json
    │
    ├── config/                     # Configuration management
    │   ├── src/
    │   │   ├── schema.ts          # Zod config schema
    │   │   ├── loader.ts          # Config loader
    │   │   └── index.ts
    │   ├── package.json
    │   └── tsconfig.json
    │
    └── utils/                      # Shared utilities
        ├── src/
        │   ├── date.ts            # Date utilities
        │   ├── string.ts          # String utilities
        │   ├── validation.ts      # Validation helpers
        │   └── index.ts
        ├── package.json
        └── tsconfig.json
```

## Key Principles

### Apps (`apps/`)
- **Runnable services** - entry points for deployment
- **Thin handlers/controllers** - validate, delegate, respond
- **No business logic** - call services from packages

### Packages (`packages/`)
- **Reusable libraries** - shared across multiple apps
- **Business logic** - services, utilities, integrations
- **Type-safe** - export types from `@ai-agent/core`

### Separation of Concerns

| Concern | Location |
|---------|----------|
| Types & constants | `packages/core` |
| Database access | `packages/database` |
| Queue operations | `packages/queue` |
| File storage | `packages/storage` |
| AI providers | `packages/ai` |
| Media processing | `packages/media` |
| Social publishing | `packages/publishing` |
| Logging/metrics | `packages/observability` |
| Configuration | `packages/config` |
| Utilities | `packages/utils` |
| **Analysis logic** | `apps/worker-analysis` |
| **Generation logic** | `apps/worker-generation` |
| **Rendering logic** | `apps/worker-render` (ONLY) |
| **Publishing logic** | `apps/worker-publish` (ONLY) |
| User interface (bot) | `apps/telegram-bot` |
| User interface (API) | `apps/api` |

### File Naming Conventions

- **TypeScript files**: `kebab-case.ts`
- **Interfaces**: `*.interface.ts`
- **Services**: `*-service.ts` or `*.service.ts`
- **Prompt files**: `*.prompt.md` (in `packages/ai/src/prompts/`)
- **Tests**: `*.test.ts` or `*.spec.ts`
- **Config files**: `.rc` or `.config.js`

### Import Patterns

```typescript
// ✅ GOOD: Import from workspace packages
import { Content, ContentType } from '@ai-agent/core';
import { database } from '@ai-agent/database';
import { queueService } from '@ai-agent/queue';
import { aiService } from '@ai-agent/ai';

// ❌ BAD: Relative imports across packages
import { Content } from '../../../packages/core/src/types';
```

### Deployment Units

Each app in `apps/` can be deployed independently:

- `telegram-bot` → Single process/container
- `api` → Horizontally scalable (multiple instances)
- `worker-analysis` → Horizontally scalable
- `worker-generation` → Horizontally scalable
- `worker-render` → May need GPU, scale separately
- `worker-publish` → Horizontally scalable

Packages are bundled into apps, not deployed separately.
