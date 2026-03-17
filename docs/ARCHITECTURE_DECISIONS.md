# Architecture Decisions - AI Content Agent

**Last Updated:** 2026-03-16

---

## 1. AI Provider: Custom Gemini Integration (Not OpenClaw)

**Decision:** Use Google Gemini API directly via `@google/generative-ai` SDK

**Rationale:**
- **Simplicity:** MVP needs straightforward AI calls (analyze, generate, revise)
- **Control:** Full control over prompts, temperature, and response formats
- **Cost:** Gemini 2.0 Flash has generous free tier (15 RPM, 1M TPM)
- **Performance:** Direct API calls without orchestration overhead
- **Maintainability:** One dependency (`@google/generative-ai`), clear code path

**Not using OpenClaw because:**
- OpenClaw is for complex multi-agent orchestration
- This MVP has linear workflow: upload → analyze → generate → publish
- No need for agent-to-agent communication
- No need for memory/tool management
- Adding OpenClaw would add complexity without benefit

**Implementation:**
- `packages/ai/src/providers/gemini/` - Gemini client wrapper
- `packages/ai/src/agents/content-agent.ts` - Orchestration logic
- Prompts in `.prompt.md` files for easy iteration

**Future consideration:**
- If we add complex multi-step reasoning or autonomous agents, reconsider
- For now: KISS (Keep It Simple, Stupid)

---

## 2. Media Storage: S3-Compatible (MinIO for dev, AWS S3 for prod)

**Decision:** Use S3-compatible storage with `@aws-sdk/client-s3`

**Rationale:**
- **Compatibility:** Works with AWS S3, MinIO, DigitalOcean Spaces, Backblaze B2
- **Local development:** MinIO Docker container (free, fast)
- **Production:** AWS S3 (reliable, cheap for media storage)
- **Standard:** S3 API is industry standard

**Implementation:**
- `packages/storage/src/services/s3-storage.service.ts`
- Configurable endpoint (empty for AWS, custom for MinIO/Spaces)
- Signed URLs for private buckets

---

## 3. Queue System: BullMQ (Redis-backed)

**Decision:** Use BullMQ for job queue

**Rationale:**
- **Proven:** Industry standard for Node.js job queues
- **Features:** Retries, timeouts, rate limiting, job prioritization
- **Observability:** Built-in progress tracking and logging
- **Redis:** We already use Redis (no new infrastructure)

**Workers:**
- `worker-analysis` - Media analysis (Gemini Vision)
- `worker-generation` - Draft generation (Gemini Text)
- `worker-publish` - YouTube + Facebook publishing

**Retry strategy:**
- Exponential backoff (5s → 10s → 20s → 40s)
- 3 retries for AI jobs, 5 retries for publishing

---

## 4. Database: PostgreSQL with Prisma

**Decision:** PostgreSQL with Prisma ORM

**Rationale:**
- **Relational data:** Sessions, media, drafts, publish jobs are relational
- **Type safety:** Prisma generates TypeScript types from schema
- **Migrations:** Declarative schema with auto-generated migrations
- **Performance:** PostgreSQL is fast, reliable, well-supported

**Schema:**
- 8 models (User, BrandProfile, ContentSession, SessionMessage, MediaAsset, DraftPackage, PublishJob, ConnectedAccount)
- Enums for SessionStatus, MessageRole, MediaType, Platform

---

## 5. Telegram Bot: telegraf

**Decision:** Use telegraf library for Telegram Bot API

**Rationale:**
- **Simplicity:** Clean, typed API
- **Features:** Commands, callbacks, inline keyboards
- **Maintained:** Active community, regular updates

**Separation:**
- `apps/telegram-bot` - Bot handlers (thin)
- `packages/media/src/services/telegram-*.service.ts` - Telegram API wrappers
- Bot only does orchestration, services do the work

---

## 6. Monorepo: pnpm workspaces + Turborepo

**Decision:** Monorepo with pnpm workspaces

**Rationale:**
- **Code sharing:** Reusable packages (`@ai-agent/*`)
- **Type safety:** Shared types across apps
- **Development:** Change package → all apps see changes immediately
- **Build:** Turborepo for incremental builds

**Structure:**
- `apps/` - Runnable services (telegram-bot, worker-*, api)
- `packages/` - Reusable logic (ai, storage, database, queue, etc.)

---

## 7. Publishing: OAuth 2.0 with ConnectedAccount

**Decision:** Store OAuth tokens in ConnectedAccount model

**Rationale:**
- **Security:** Encrypted tokens in database
- **Per-user:** Each user connects their own YouTube/Facebook accounts
- **Refresh:** Auto-refresh expired tokens
- **Scopes:** Request minimal required permissions

**Platforms:**
- YouTube: Upload as Short, set metadata
- Facebook: Create post with media attachment

---

## 8. Video Analysis: Direct URL (Not Base64)

**Decision:** Pass S3 URLs to Gemini, not base64-encoded buffers

**Rationale:**
- **Memory:** Large videos (>20MB) crash with base64 in-memory
- **Performance:** Gemini can fetch from URL directly
- **Simplicity:** No need to encode/decode

**Implementation:**
- Upload video to S3
- Generate public or signed URL
- Pass URL to Gemini API
- Gemini fetches and analyzes

**Note:** Gemini API supports both:
- `inlineData` (base64) - for small files
- `fileData` (URL) - for large files ✅ Use this

---

## 9. Prompt Management: Files (`.prompt.md`)

**Decision:** Store prompts in separate `.prompt.md` files

**Rationale:**
- **Iteration:** Edit prompts without touching code
- **Version control:** Track prompt changes in git
- **Templating:** Simple `{{variable}}` substitution
- **Collaboration:** Non-developers can edit prompts

**Location:** `packages/ai/src/prompts/{category}/{name}.prompt.md`

**Example:**
- `analysis/media-analyzer.prompt.md`
- `generation/draft-generator.prompt.md`
- `revision/revise-drafts.prompt.md` ← **TODO: Create this**

---

## 10. Error Handling: Fail Fast + User Notification

**Decision:** Workers fail fast and notify user on error

**Rationale:**
- **User experience:** User knows immediately when something failed
- **Debugging:** Clear error messages in logs
- **Recovery:** User can retry or cancel

**Strategy:**
- Job fails → Update session status to FAILED
- Send Telegram notification to user
- Log error with full context
- BullMQ retries automatically (with backoff)

---

## Future Decisions (Not for MVP)

- **Monitoring:** Sentry for error tracking
- **Logging:** Structured logs (pino) + centralized aggregation
- **Caching:** Redis for media analysis results
- **CDN:** CloudFront for S3 media delivery
- **Scaling:** Horizontal scaling of workers
- **Multi-platform:** Instagram, TikTok, Twitter

---

## Summary

| Decision | Choice | Why |
|----------|--------|-----|
| AI Provider | **Gemini Direct** | Simple, cheap, full control |
| Storage | **S3 (MinIO dev)** | Standard, compatible, cheap |
| Queue | **BullMQ** | Proven, feature-rich, Redis |
| Database | **PostgreSQL + Prisma** | Relational, type-safe, migrations |
| Bot | **telegraf** | Clean API, well-maintained |
| Monorepo | **pnpm workspaces** | Code sharing, type safety |
| OAuth | **ConnectedAccount** | Per-user, secure, refresh |
| Video | **S3 URL → Gemini** | No memory issues, fast |
| Prompts | **`.prompt.md` files** | Easy to iterate, version control |
| Errors | **Fail fast + notify** | User experience, debugging |

---

**Next update:** When we add new platforms or scale beyond MVP.
