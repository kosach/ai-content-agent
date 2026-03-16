# Blocking Issues - MVP End-to-End Readiness

**Audit Date:** 2026-03-16  
**Status:** ⚠️ **NOT READY FOR PRODUCTION**

---

## 🚨 Critical Schema-Code Mismatches

### Issue 1: ConnectedAccount Field Mismatch

**Schema (schema.prisma):**
```prisma
model ConnectedAccount {
  platformUserId String
  username       String?  // ❌ Wrong field name
  // ...
}
```

**Code (apps/api/src/routes/oauth.ts):**
```typescript
platformUserName: channel.snippet?.title || undefined,  // ❌ Field doesn't exist
```

**Impact:** ❌ **BLOCKER**
- OAuth callbacks will fail when saving ConnectedAccount
- Runtime error: "Field 'platformUserName' does not exist on ConnectedAccount"
- Cannot connect YouTube or Facebook accounts

**Fix Required:**
```diff
# Option 1: Update schema to match code
model ConnectedAccount {
  platformUserId   String
- username        String?
+ platformUserName String?
}

# Option 2: Update code to match schema
- platformUserName: channel.snippet?.title,
+ username: channel.snippet?.title,
```

**Recommendation:** Update schema → `platformUserName` (more descriptive)

---

### Issue 2: PublishJob Missing Error Fields

**Schema (schema.prisma):**
```prisma
model PublishJob {
  error String? @db.Text  // ❌ Only one generic field
  // Missing: errorType, errorStack, retryAfter
}
```

**Code (apps/worker-publish/src/jobs/publish-youtube.ts):**
```typescript
await database.publishJob.update({
  where: { id: publishJobId },
  data: {
    status: 'FAILED',
    errorMessage: error.message,    // ❌ Field doesn't exist
    errorType: error.type,           // ❌ Field doesn't exist
    errorStack: error.stack,         // ❌ Field doesn't exist
    retryAfter: error.retryAfter,    // ❌ Field doesn't exist
  },
});
```

**Impact:** ❌ **BLOCKER**
- Worker-publish will fail when handling errors
- Runtime error: "Field 'errorMessage' does not exist on PublishJob"
- Cannot track error types or schedule retries
- Publishing will crash on first error

**Fix Required:**
```diff
model PublishJob {
- error          String?  @db.Text
+ errorMessage   String?  @db.Text
+ errorType      String?
+ errorStack     String?  @db.Text
+ retryAfter     DateTime?
}
```

---

### Issue 3: Missing Database Migration

**Current state:**
- Schema changes needed but no migration created
- Prisma client generated from old schema
- Runtime errors guaranteed

**Impact:** ❌ **BLOCKER**
- All database operations will fail
- Workers won't start
- OAuth won't work

**Fix Required:**
```bash
cd packages/database
npx prisma migrate dev --name fix-schema-mismatches
npx prisma generate
```

---

## 🔍 OAuth Flow Verification Issues

### Issue 4: OAuth Callback Validation Missing

**Current implementation (apps/api/src/routes/oauth.ts):**
```typescript
// State stored in-memory Map
const oauthStates = new Map<string, { telegramId, platform, expiresAt }>();
```

**Problems:**
- ❌ In-memory storage lost on server restart
- ❌ No cleanup on expired states (setInterval not reliable)
- ❌ No CSRF token validation beyond state
- ❌ Multiple API instances won't share state

**Impact:** ⚠️ **MEDIUM RISK**
- OAuth flow breaks if API restarts during user auth
- Security risk (weak CSRF protection)
- Won't work in multi-instance deployment

**Fix Required:**
```typescript
// Use Redis for state storage
await redis.setex(`oauth_state:${state}`, 600, JSON.stringify(data));
```

---

### Issue 5: Token Encryption Missing

**Current implementation:**
```typescript
await database.connectedAccount.upsert({
  // ...
  data: {
    accessToken: tokens.access_token!,  // ❌ Stored in plain text
    refreshToken: tokens.refresh_token,  // ❌ Stored in plain text
  }
});
```

**Impact:** ⚠️ **SECURITY RISK**
- Access tokens stored unencrypted in database
- Database breach exposes all OAuth tokens
- Compliance risk (GDPR, etc.)

**Fix Required:**
```typescript
import { encrypt, decrypt } from './crypto';

accessToken: encrypt(tokens.access_token!),
refreshToken: encrypt(tokens.refresh_token),

// In worker-publish:
const decryptedToken = decrypt(connectedAccount.accessToken);
```

---

## 🔧 Worker Compilation Issues

### Issue 6: Missing Dependencies

**apps/worker-publish/package.json:**
```json
{
  "dependencies": {
    // Missing @ai-agent/publishing
    // Missing @ai-agent/media
    // Missing googleapis
    // Missing form-data
  }
}
```

**Impact:** ❌ **BLOCKER**
- Worker won't compile
- Import errors for YouTubePublisher, FacebookPublisher
- Cannot run `pnpm dev`

**Fix Required:**
```bash
cd apps/worker-publish
pnpm add @ai-agent/publishing @ai-agent/media googleapis form-data
```

---

### Issue 7: API Server Missing Dependencies

**apps/api/package.json:**
```json
{
  "dependencies": {
    // Missing @ai-agent/media
    // Missing googleapis
    // Missing axios
  }
}
```

**Impact:** ❌ **BLOCKER**
- API won't compile
- OAuth endpoints will fail
- Cannot start server

**Fix Required:**
```bash
cd apps/api
pnpm add @ai-agent/media googleapis axios
```

---

## 📦 Type Safety Issues

### Issue 8: Prisma Client Not Regenerated

**Current state:**
- Schema edited but `prisma generate` not run
- TypeScript sees old field names
- Type errors in IDE

**Impact:** ❌ **BLOCKER**
- TypeScript compilation will fail
- Type safety broken

**Fix Required:**
```bash
cd packages/database
npx prisma generate
```

---

## 🧪 End-to-End Readiness Issues

### Issue 9: No OAuth Apps Configured

**Required but missing:**
- YouTube OAuth app (client ID, secret)
- Facebook OAuth app (app ID, secret)
- Redirect URIs registered

**Impact:** ❌ **BLOCKER**
- Cannot test OAuth flow
- Cannot connect accounts
- Cannot publish

**Fix Required:**
1. Create YouTube app in Google Cloud Console
2. Create Facebook app in Facebook Developers
3. Add credentials to `.env`
4. Register redirect URIs

---

### Issue 10: S3 Download Not Implemented Correctly

**Current code (apps/worker-publish/src/jobs/publish-youtube.ts):**
```typescript
async function downloadFromS3(storageUrl: string): Promise<Buffer> {
  // Extract key from URL
  const url = new URL(storageUrl);
  const key = url.pathname.substring(1); // ❌ Doesn't actually use S3 SDK

  // For now, use fetch (in production, use S3 SDK)
  const response = await fetch(storageUrl);  // ❌ Won't work for private buckets
  // ...
}
```

**Impact:** ⚠️ **MEDIUM RISK**
- Won't work with private S3 buckets (403 Forbidden)
- No signed URL support
- `fetch()` may timeout on large files

**Fix Required:**
```typescript
import { s3Storage } from '@ai-agent/storage';

async function downloadFromS3(storageUrl: string): Promise<Buffer> {
  const key = extractKeyFromUrl(storageUrl);
  const stream = await s3Storage.getObjectStream(key);
  return streamToBuffer(stream);
}
```

---

### Issue 11: Missing FormData Types

**apps/api/package.json missing:**
```json
"devDependencies": {
  "@types/node": "^22.10.1",
  // Missing @types/form-data
}
```

**Impact:** ⚠️ **COMPILATION WARNING**
- TypeScript errors in FacebookPublisher
- `form-data` import shows type warnings

**Fix Required:**
```bash
pnpm add -D @types/form-data
```

---

## 🎯 Blocking Issues Summary

### Must Fix Before Any Testing (Critical)

1. ✅ **Fix ConnectedAccount.username → platformUserName**
2. ✅ **Add PublishJob error fields (errorMessage, errorType, etc.)**
3. ✅ **Run database migration**
4. ✅ **Regenerate Prisma client**
5. ✅ **Add worker-publish dependencies**
6. ✅ **Add API server dependencies**
7. ✅ **Setup OAuth apps (YouTube + Facebook)**
8. ✅ **Fix S3 download implementation**

### Should Fix Before Production (Important)

9. 🔶 **Move OAuth state to Redis**
10. 🔶 **Encrypt OAuth tokens**
11. 🔶 **Add @types/form-data**

---

## ✅ Readiness Checklist

### Schema & Database
- [ ] Fix `ConnectedAccount.username` → `platformUserName`
- [ ] Add `PublishJob.errorMessage`, `errorType`, `errorStack`, `retryAfter`
- [ ] Run `prisma migrate dev`
- [ ] Run `prisma generate`
- [ ] Verify migration applied to database

### Dependencies
- [ ] Add dependencies to `apps/worker-publish/package.json`
- [ ] Add dependencies to `apps/api/package.json`
- [ ] Run `pnpm install` in workspace root
- [ ] Verify all imports resolve

### OAuth Setup
- [ ] Create YouTube OAuth app
- [ ] Create Facebook OAuth app
- [ ] Copy credentials to `.env`
- [ ] Register redirect URIs
- [ ] Test OAuth flow manually

### Code Fixes
- [ ] Fix S3 download to use SDK (not fetch)
- [ ] Implement token encryption (optional for MVP)
- [ ] Move state to Redis (optional for MVP)

### Compilation
- [ ] `pnpm build` succeeds in all packages
- [ ] `pnpm type-check` passes
- [ ] No TypeScript errors

### Runtime
- [ ] All workers start without errors
- [ ] API server starts without errors
- [ ] Telegram bot starts without errors
- [ ] Database connections work
- [ ] Redis connections work

### End-to-End Test
- [ ] OAuth connect YouTube succeeds
- [ ] OAuth connect Facebook succeeds
- [ ] Upload video → drafts generated
- [ ] Approve → PublishJobs created
- [ ] **YouTube Short publishes successfully** ← **CRITICAL**
- [ ] **Facebook post publishes successfully** ← **CRITICAL**
- [ ] Receive notification with URLs
- [ ] Verify content live on platforms

---

## 🚫 Do NOT Claim Completion Until

1. ✅ All schema mismatches fixed
2. ✅ All workers compile and run
3. ✅ OAuth apps configured
4. ✅ **One real YouTube Short published successfully**
5. ✅ **One real Facebook post published successfully**
6. ✅ End-to-end test checklist completed

---

## ⏱️ Estimated Fix Time

- Schema fixes: 15 minutes
- Dependencies: 5 minutes
- OAuth app setup: 30 minutes
- Code fixes: 30 minutes
- Testing: 1-2 hours

**Total:** 2.5-3 hours to true MVP completion

---

**Current Status:** 🔴 **BLOCKED - Schema mismatches prevent any testing**

**Next Step:** Fix schema, migrate, regenerate client, then test compilation.
