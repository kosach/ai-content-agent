# Quick Reference Card

## 📁 Where Does Code Go?

| I want to... | Location | Example |
|--------------|----------|---------|
| Add a Telegram command | `apps/telegram-bot/src/handlers/` | Thin handler, enqueue job |
| Add an API endpoint | `apps/api/src/controllers/` | Thin controller, call service |
| Add AI analysis logic | `packages/ai/src/services/` | Business logic |
| Add image rendering | `apps/worker-render/src/renderers/` | **ONLY place** |
| Add Twitter publishing | `packages/publishing/src/platforms/` | Implement `IPublisher` |
| Add a new type | `packages/core/src/types/` | Export from index |
| Add a database model | `packages/database/prisma/schema.prisma` | Run `pnpm db:generate` |
| Add utility function | `packages/utils/src/` | Reusable helpers |
| Add a prompt | `packages/ai/src/prompts/{category}/` | `.prompt.md` file |

## 🚀 Common Commands

```bash
# Install
pnpm install

# Development
pnpm dev                                    # All services
pnpm --filter @ai-agent/telegram-bot dev  # Specific service

# Build
pnpm build                                  # All packages
pnpm --filter @ai-agent/core build         # Specific package

# Quality
pnpm type-check                             # TypeScript check
pnpm lint                                   # Lint all
pnpm format                                 # Format all

# Database
pnpm db:generate                            # Generate Prisma client
pnpm db:push                                # Push schema (dev)
pnpm db:migrate                             # Create migration

# Clean
pnpm clean                                  # Remove all dist/
```

## 🎯 Architecture Cheat Sheet

### Thin Handler Pattern (Telegram)
```typescript
async function handleCommand(ctx) {
  // 1. Validate
  const data = validate(ctx.message);
  
  // 2. Enqueue (async)
  await queueService.enqueue(JobType.ANALYZE, data);
  
  // 3. Respond immediately
  await ctx.reply('Processing...');
}
```

### Worker Job Pattern
```typescript
export async function myJob(job: Job) {
  // 1. Update status
  await db.update({ status: PROCESSING });
  
  // 2. Do work (call service from package)
  const result = await service.doWork(job.data);
  
  // 3. Enqueue next job
  await queue.enqueue(NEXT_JOB, result);
  
  return result;
}
```

### Publisher Pattern
```typescript
export class TwitterPublisher implements IPublisher {
  async publish(req: PublishRequest): Promise<PublishResult> {
    // Platform-specific implementation
  }
  
  async validateCredentials(): Promise<boolean> {
    // Auth check
  }
  
  getConstraints(): PlatformConstraints {
    return { maxTextLength: 280 };
  }
}
```

## 📦 Package Dependencies

### Apps can use:
✅ Any package from `packages/`  
✅ External npm packages  
❌ Other apps

### Packages can use:
✅ Other packages (but avoid circular deps)  
✅ External npm packages  
❌ Apps

## 🔄 Data Flow

```
User Input (Telegram/API)
    ↓
[Telegram Bot / API]
    ↓ (enqueue)
[Queue: Analysis]
    ↓
[Worker: Analysis]
    ↓ (enqueue)
[Queue: Generation]
    ↓
[Worker: Generation]
    ↓ (enqueue)
[Queue: Render]
    ↓
[Worker: Render]
    ↓ (enqueue)
[Queue: Publish]
    ↓
[Worker: Publish]
    ↓
Social Platform
```

## ⚠️ Common Mistakes

| ❌ Wrong | ✅ Right |
|----------|----------|
| Business logic in handler | Enqueue job, logic in worker |
| Rendering in worker-generation | Rendering only in worker-render |
| Publishing in worker-render | Publishing only in worker-publish |
| Hardcoded prompts | Prompts in `.prompt.md` files |
| Direct platform imports | Platform behind `IPublisher` |
| Blocking operations | Queue + async processing |
| Import from other apps | Import from packages only |

## 📚 Essential Reading (in order)

1. **AGENT_INSTRUCTIONS.md** - Architecture rules (MANDATORY)
2. **STRUCTURE.md** - Folder layout
3. **README.md** - Project overview
4. **SETUP.md** - Setup steps

## 🐛 Debugging

```bash
# Check logs
pnpm --filter @ai-agent/worker-analysis dev

# Type errors
pnpm type-check

# Lint errors
pnpm lint

# Build errors
pnpm --filter @ai-agent/core build

# Database issues
pnpm db:push
```

## 📞 Quick Help

**Q: Where do I put this code?**  
A: If it's runnable → `apps/`. If it's reusable → `packages/`

**Q: My handler is getting complex**  
A: Move logic to `packages/*/src/services/`, keep handler thin

**Q: How do I add a new platform?**  
A: Implement `IPublisher` in `packages/publishing/src/platforms/`

**Q: Should I use a queue?**  
A: If it takes >1s or involves AI/rendering/publishing → YES

**Q: Where do prompts go?**  
A: `packages/ai/src/prompts/{category}/{name}.prompt.md`

---

**Print this card and keep it next to your keyboard! 📌**
