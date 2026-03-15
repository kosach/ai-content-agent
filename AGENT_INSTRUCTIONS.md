# Agent Instructions - AI Content Agent Monorepo

**For AI Coding Assistants (Claude Code, Cursor, GitHub Copilot, etc.)**

## 🎯 Core Principles

When working on this codebase, **strictly follow these architectural rules**:

### 1. Separation: Apps vs Packages

```
✅ DO:
- apps/* = runnable services (thin orchestration layer)
- packages/* = reusable business logic and utilities

❌ DON'T:
- Put business logic in apps
- Put service runners in packages
```

### 2. Thin Controllers/Handlers

**Telegram Bot Handlers** (apps/telegram-bot/src/handlers/):
```typescript
// ✅ GOOD: Thin handler
async function handleCreateContent(ctx: Context) {
  const { userId, message } = parseContext(ctx);
  
  // Enqueue job
  await queueService.enqueueAnalysis({ userId, message });
  
  // Respond immediately
  await ctx.reply('Creating your content...');
}

// ❌ BAD: Business logic in handler
async function handleCreateContent(ctx: Context) {
  const analysis = await analyzeContent(ctx.message); // NO!
  const content = await generateContent(analysis);     // NO!
  await publishContent(content);                       // NO!
}
```

**API Controllers** (apps/api/src/controllers/):
```typescript
// ✅ GOOD: Thin controller
async function createContent(req: Request, reply: Reply) {
  const data = validateCreateContentRequest(req.body);
  const content = await contentService.create(data);
  return reply.code(201).send(content);
}

// ❌ BAD: Business logic in controller
async function createContent(req: Request, reply: Reply) {
  const analysis = await analyzeWithOpenAI(req.body);  // NO!
  const rendered = await renderImage(analysis);         // NO!
  // Controllers should only validate and delegate
}
```

### 3. Worker Responsibilities

Each worker has **ONE JOB**:

| Worker | Responsibility | Package Used |
|--------|---------------|--------------|
| `worker-analysis` | Analyze user requests | `@ai-agent/ai` |
| `worker-generation` | Generate content text/prompts | `@ai-agent/ai` |
| `worker-render` | **ONLY** place for rendering | `@ai-agent/media` |
| `worker-publish` | **ONLY** place for publishing | `@ai-agent/publishing` |

```typescript
// ✅ GOOD: Rendering only in worker-render
// File: apps/worker-render/src/jobs/render-image.ts
export async function renderImageJob(job: Job) {
  const { imagePrompt, style } = job.data;
  const rendered = await imageRenderer.render(imagePrompt, style);
  await storage.upload(rendered);
  return { url: rendered.url };
}

// ❌ BAD: Rendering in worker-generation
// File: apps/worker-generation/src/jobs/generate-content.ts
export async function generateContentJob(job: Job) {
  const text = await ai.generateText(job.data);
  const image = await sharp().resize(1080, 1080); // NO! Rendering belongs in worker-render
  return { text, image };
}
```

### 4. Prompts in Files

**Never hardcode prompts**. Always use dedicated prompt files:

```typescript
// ✅ GOOD: Prompt from file
import { readPromptFile } from '@ai-agent/ai';

const prompt = await readPromptFile('analysis/content-analyzer.prompt.md');
const result = await ai.complete(prompt, { userRequest });

// ❌ BAD: Hardcoded prompt
const result = await ai.complete(
  `You are a content analyzer. Analyze this: ${userRequest}`, // NO!
);
```

**Prompt file location**: `packages/ai/src/prompts/{category}/{name}.prompt.md`

### 5. Platform Isolation

All social platform integrations **must** implement `IPublisher`:

```typescript
// ✅ GOOD: Platform behind interface
// File: packages/publishing/src/platforms/twitter-publisher.ts
import { IPublisher } from '../interfaces/publisher.interface';

export class TwitterPublisher implements IPublisher {
  async publish(request: PublishRequest): Promise<PublishResult> {
    // Twitter-specific implementation
  }
  
  async validateCredentials(): Promise<boolean> {
    // Twitter auth check
  }
  
  getConstraints(): PlatformConstraints {
    return { maxTextLength: 280, maxMediaCount: 4 };
  }
}

// ❌ BAD: Direct platform code without interface
export async function publishToTwitter(content: Content) {
  const twitter = new TwitterApi(token);
  await twitter.v2.tweet(content.text); // NO! Use interface
}
```

**New platform checklist**:
1. Implement `IPublisher` in `packages/publishing/src/platforms/`
2. Export from `packages/publishing/src/index.ts`
3. Register in `apps/worker-publish/src/services/publisher-registry.ts`
4. **Never** import platform directly in apps or other packages

### 6. Async Processing

**Always use queues** for long-running tasks:

```typescript
// ✅ GOOD: Enqueue job
import { queueService } from '@ai-agent/queue';

await queueService.enqueueGeneration({
  contentId: content.id,
  userId: user.id,
});

// User gets immediate response
// Worker processes async

// ❌ BAD: Blocking operation
const generated = await ai.generateContent(request); // NO! This blocks the handler
await renderImage(generated);
await publishToTwitter(generated);
```

### 7. Business Logic Location

```
✅ Business logic belongs in:
- packages/*/src/services/
- packages/*/src/utils/
- packages/core/src/

❌ Business logic does NOT belong in:
- apps/*/src/handlers/
- apps/*/src/controllers/
- apps/*/src/routes/
```

### 8. Type Safety

**Use core types** for everything:

```typescript
// ✅ GOOD: Import from core
import { Content, ContentType, JobData } from '@ai-agent/core';

function processContent(content: Content) {
  if (content.type === ContentType.IMAGE) {
    // Type-safe!
  }
}

// ❌ BAD: Local types or strings
function processContent(content: any) {
  if (content.type === 'image') { // NO! Use enum
    // Not type-safe
  }
}
```

### 9. Configuration

**Never hardcode config**:

```typescript
// ✅ GOOD: Use config package
import { config } from '@ai-agent/config';

const apiKey = config.openai.apiKey;
const redisUrl = config.redis.url;

// ❌ BAD: Hardcoded or direct env access
const apiKey = process.env.OPENAI_API_KEY; // NO! Use config package
const apiUrl = 'https://api.openai.com';    // NO! Use config
```

### 10. Observability

**Always log and trace**:

```typescript
// ✅ GOOD: Structured logging
import { logger } from '@ai-agent/observability';

logger.info({ contentId, userId }, 'Starting content generation');

try {
  const result = await generateContent(data);
  logger.info({ contentId, result }, 'Generation completed');
} catch (error) {
  logger.error({ contentId, error }, 'Generation failed');
  throw error;
}

// ❌ BAD: Console.log
console.log('Generating content...'); // NO!
```

## 🛠️ Development Workflow

### Adding a New Feature

1. **Define types** in `packages/core/src/types/`
2. **Implement service** in appropriate `packages/*/src/services/`
3. **Add queue job** in appropriate `apps/worker-*/src/jobs/`
4. **Expose via API** in `apps/api/src/controllers/` (thin!)
5. **Add Telegram command** in `apps/telegram-bot/src/handlers/` (thin!)

### Adding a New Social Platform

1. **Implement interface** `IPublisher` in `packages/publishing/src/platforms/`
2. **Add constraints** (character limits, etc.)
3. **Register** in worker-publish registry
4. **Add enum** to `Platform` in `packages/core/src/types/platform.ts`
5. **Update docs**

### Adding a New Job Type

1. **Add enum** to `JobType` in `packages/core/src/types/job.ts`
2. **Create job handler** in appropriate worker `apps/worker-*/src/jobs/`
3. **Add queue constant** in `packages/core/src/constants/`
4. **Enqueue from** handler/controller

## 🚫 Anti-Patterns to Avoid

### ❌ Fat Controllers
```typescript
// BAD: Controller doing everything
async function createPost(req, reply) {
  const user = await db.user.findUnique({ where: { id: req.userId } });
  const analysis = await openai.analyze(req.body.text);
  const content = await generateContent(analysis);
  const image = await renderImage(content);
  const published = await publishToTwitter(content, image);
  return reply.send({ published });
}
```

### ❌ Direct Platform Imports
```typescript
// BAD: Importing platform directly
import { TwitterApi } from 'twitter-api-v2';

async function publish(content: Content) {
  const twitter = new TwitterApi(token);
  await twitter.v2.tweet(content.text);
}
```

### ❌ Mixed Responsibilities
```typescript
// BAD: Worker doing multiple jobs
export async function processContent(job: Job) {
  const analyzed = await analyzeContent(job.data);
  const generated = await generateContent(analyzed);
  const rendered = await renderImage(generated);
  const published = await publishContent(rendered);
  // This is 4 workers combined into one!
}
```

### ❌ Hardcoded Prompts
```typescript
// BAD: Prompt in code
const prompt = `You are a content creator...`;
```

### ❌ Blocking Operations
```typescript
// BAD: Long operation in handler
async function handleCommand(ctx) {
  const result = await generateAndPublish(ctx.message); // Blocks!
  await ctx.reply(result);
}
```

## ✅ Quick Reference

**When adding code, ask:**

1. ❓ Is this an app or package?
   - Runnable service → `apps/`
   - Reusable logic → `packages/`

2. ❓ Is my handler/controller thin?
   - Should only: validate, call service, return
   - Business logic → service layer

3. ❓ Is this in the right worker?
   - Analysis → `worker-analysis`
   - Generation → `worker-generation`
   - Rendering → `worker-render` (**only place!**)
   - Publishing → `worker-publish` (**only place!**)

4. ❓ Am I using prompts correctly?
   - Prompts in `.prompt.md` files
   - Never hardcoded in code

5. ❓ Are platforms isolated?
   - Behind `IPublisher` interface
   - In `packages/publishing/src/platforms/`

6. ❓ Am I blocking?
   - Long tasks → enqueue job
   - Return immediately to user

7. ❓ Am I using types?
   - Import from `@ai-agent/core`
   - Never use `any` or strings for enums

## 🎓 Learning Path

**For new contributors:**

1. Read `packages/core/src/types/` - understand data models
2. Review `apps/telegram-bot/src/handlers/` - see thin handler pattern
3. Study `apps/worker-*/src/jobs/` - see worker responsibilities
4. Check `packages/publishing/src/platforms/` - see interface pattern
5. Explore `packages/ai/src/prompts/` - see prompt organization

## 📞 When in Doubt

**Before writing code:**
- Check if it already exists in packages
- Check if you're in the right app/package
- Check if you're following the thin handler pattern
- Check if you're using the right types from core

**After writing code:**
- Run `pnpm type-check` - must pass
- Run `pnpm lint` - must pass
- Ask: "Is this logic reusable?" → If yes, move to package
- Ask: "Does this block the user?" → If yes, use queue

---

**Remember: This architecture exists to support scaling. Follow it strictly.**
