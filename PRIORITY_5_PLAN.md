# Priority 5 Plan: YouTube + Facebook Publishing

**Goal:** Implement real publishing to YouTube Shorts and Facebook posts.

**Status:** Not Started  
**Blockers:** None (draft generation complete)

---

## Scope (Strict)

### ✅ In Scope
1. YouTubePublisher implementation
2. FacebookPublisher implementation
3. worker-publish (processes both queues)
4. OAuth connection flow (YouTube + Facebook)
5. Publish completion notifications
6. Idempotency / retry handling
7. Partial-success handling

### ❌ Out of Scope (Post-MVP)
- Instagram, TikTok, Twitter
- Scheduled publishing
- Analytics/insights
- Advanced video editing
- Multi-account publishing
- Bulk operations

---

## Implementation Order

### Phase 1: Publisher Interfaces & Base Classes

**Files to create:**
- `packages/publishing/src/interfaces/publisher.interface.ts`
- `packages/publishing/src/base/base-publisher.ts` (optional)
- `packages/publishing/src/types/publish-result.ts`

**Goal:** Define clean interfaces that both publishers implement.

---

### Phase 2: YouTube Publisher

**Dependencies:**
- `googleapis` (YouTube Data API v3)
- `@google-cloud/local-auth` (OAuth 2.0)

**Files to create:**
- `packages/publishing/src/platforms/youtube-publisher.ts`
- `packages/publishing/src/platforms/youtube/auth.ts`
- `packages/publishing/src/platforms/youtube/upload.ts`

**Key features:**
- Upload video as Short (duration ≤60s)
- Set title, description, hashtags
- Privacy: public/unlisted/private
- Return video ID + URL
- Handle quotas (10,000 units/day default)

**Idempotency:**
- Check if video already uploaded (by custom metadata)
- If publishJob already has platformPostId → skip upload
- Use videoId to avoid duplicate uploads

**Error handling:**
- Quota exceeded → retry next day (don't fail job)
- Invalid video format → fail job with clear error
- Auth expired → refresh token → retry
- Network timeout → retry with backoff

---

### Phase 3: Facebook Publisher

**Dependencies:**
- `axios` (Graph API)
- No official SDK needed (REST API is simple)

**Files to create:**
- `packages/publishing/src/platforms/facebook-publisher.ts`
- `packages/publishing/src/platforms/facebook/auth.ts`
- `packages/publishing/src/platforms/facebook/upload.ts`

**Key features:**
- Create video post with text + hashtags
- Upload to Page (not personal profile)
- Return post ID + URL
- Handle API rate limits

**Idempotency:**
- Check if post already created (by custom field)
- If publishJob has platformPostId → skip
- Use post ID to avoid duplicates

**Error handling:**
- Rate limit → retry with exponential backoff
- Invalid token → refresh → retry
- Video processing failed → retry
- Network timeout → retry

---

### Phase 4: Worker Publish

**Files to create:**
- `apps/worker-publish/src/index.ts`
- `apps/worker-publish/src/jobs/publish-youtube.ts`
- `apps/worker-publish/src/jobs/publish-facebook.ts`

**Two separate workers (or one worker with two queues):**
- YouTube worker: YOUTUBE_PUBLISHING queue
- Facebook worker: FACEBOOK_PUBLISHING queue

**Job flow:**
```
1. Get PublishJob from database
2. Get DraftPackage, MediaAsset, ConnectedAccount
3. Download video from S3
4. Call publisher.publish()
5. Update PublishJob (platformPostId, platformUrl, status)
6. Check if all jobs for session completed
7. If all completed → Update session status to PUBLISHED
8. Send notification to user
```

**Idempotency:**
- If PublishJob.status === 'COMPLETED' → skip
- If PublishJob.platformPostId exists → verify + skip
- On retry: check if already published before re-uploading

**Partial success handling:**
```
Scenario: YouTube succeeds, Facebook fails

Result:
- PublishJob (YouTube): status = COMPLETED, platformUrl = https://...
- PublishJob (Facebook): status = FAILED
- Session.status = PUBLISHED (if at least one succeeded)
- User notification: "Published to YouTube ✅, Facebook failed ❌"
```

---

### Phase 5: OAuth Connection Flow

**Commands to implement:**
- `/connect_youtube` - Start YouTube OAuth flow
- `/connect_facebook` - Start Facebook OAuth flow
- `/accounts` - List connected accounts
- `/disconnect <platform>` - Disconnect account

**OAuth flow (YouTube example):**
```
1. User sends /connect_youtube
2. Bot generates OAuth URL with state={telegramId}:{sessionToken}
3. Bot sends: "Click here to connect: [OAuth URL]"
4. User clicks, authorizes in browser
5. OAuth callback redirects to our server
6. Server saves tokens to ConnectedAccount
7. Server sends Telegram notification: "YouTube connected ✅"
```

**Implementation:**
- Create `/api/oauth/youtube/callback` endpoint (apps/api)
- Create `/api/oauth/facebook/callback` endpoint
- Store OAuth state in Redis (5 min TTL)
- Encrypt access/refresh tokens before storing

**Token refresh:**
- Check expiresAt before using token
- If expired → call refresh endpoint
- Update ConnectedAccount with new tokens
- Retry original operation

---

### Phase 6: Publish Completion Notifications

**Files to modify:**
- `apps/worker-publish/src/jobs/publish-youtube.ts`
- `apps/worker-publish/src/jobs/publish-facebook.ts`

**Add at end of successful job:**
```typescript
// Check if all publish jobs for session completed
const allJobs = await database.publishJob.findMany({
  where: { sessionId },
});

const allCompleted = allJobs.every(j => j.status === 'COMPLETED');
const anyCompleted = allJobs.some(j => j.status === 'COMPLETED');

if (allCompleted) {
  // All platforms succeeded
  await database.contentSession.update({
    where: { id: sessionId },
    data: { status: SessionStatus.PUBLISHED },
  });

  await telegramNotification.sendPublishConfirmation({
    chatId,
    youtubeUrl: jobs.find(j => j.platform === 'YOUTUBE')?.platformUrl,
    facebookUrl: jobs.find(j => j.platform === 'FACEBOOK')?.platformUrl,
  });
} else if (anyCompleted) {
  // Partial success
  const succeeded = allJobs.filter(j => j.status === 'COMPLETED');
  const failed = allJobs.filter(j => j.status === 'FAILED');

  await telegramNotification.sendMessage({
    chatId,
    text: `✅ Published to: ${succeeded.map(j => j.platform).join(', ')}\n` +
          `❌ Failed: ${failed.map(j => j.platform).join(', ')}`,
  });
}
```

---

### Phase 7: Idempotency & Retry Handling

**Key principle:** Jobs must be safe to retry.

**Database state:**
- PublishJob.status tracks state (PENDING → UPLOADING → COMPLETED / FAILED)
- PublishJob.platformPostId is idempotency key

**Before upload:**
```typescript
// Check if already uploaded
if (publishJob.status === 'COMPLETED' && publishJob.platformPostId) {
  logger.info('Job already completed, skipping');
  return { success: true, alreadyPublished: true };
}

// Update status to UPLOADING (prevents duplicate processing)
await database.publishJob.update({
  where: { id: publishJobId },
  data: { status: 'UPLOADING' },
});
```

**After upload:**
```typescript
// Save result atomically
await database.publishJob.update({
  where: { id: publishJobId },
  data: {
    status: 'COMPLETED',
    platformPostId: result.videoId, // or postId
    platformUrl: result.url,
    publishedAt: new Date(),
  },
});
```

**On error:**
```typescript
await database.publishJob.update({
  where: { id: publishJobId },
  data: {
    status: 'FAILED',
    errorMessage: error.message,
    errorStack: error.stack,
  },
});

// BullMQ will retry automatically (configured retries)
throw error; // Let BullMQ handle retry
```

**Retry scenarios:**
1. Network timeout → Retry (job status still UPLOADING)
2. Token expired → Refresh token → Retry
3. Quota exceeded → Retry after delay (use BullMQ backoff)
4. Video processing error → Fail job (don't retry)

---

## Testing Strategy

### Unit Tests

**YouTubePublisher:**
- Mock `googleapis` client
- Test upload with valid video
- Test idempotency (already uploaded)
- Test token refresh
- Test quota exceeded handling

**FacebookPublisher:**
- Mock Graph API requests
- Test video upload
- Test rate limit handling
- Test token refresh

### Integration Tests

**End-to-End:**
1. Create draft package
2. Approve (creates publish jobs)
3. Workers process jobs
4. Verify videos uploaded to YouTube/Facebook
5. Verify user notified
6. Verify session status = PUBLISHED

**Partial Success:**
1. Disconnect Facebook account
2. Approve draft
3. Verify YouTube succeeds
4. Verify Facebook fails gracefully
5. Verify user gets partial success notification

**Idempotency:**
1. Approve draft
2. Kill worker mid-upload
3. Restart worker
4. Verify job completes without duplicate upload

---

## Environment Variables

```env
# YouTube OAuth
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/oauth/youtube/callback

# Facebook OAuth
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/oauth/facebook/callback

# API Server (for OAuth callbacks)
API_PORT=3000
API_HOST=0.0.0.0
API_BASE_URL=http://localhost:3000
```

---

## OAuth Setup Instructions

### YouTube

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "AI Content Agent"
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/oauth/youtube/callback`
5. Copy Client ID + Secret to `.env`

**Scopes needed:**
- `https://www.googleapis.com/auth/youtube.upload`
- `https://www.googleapis.com/auth/youtube`

### Facebook

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create new app: "AI Content Agent"
3. Add Facebook Login product
4. Add Valid OAuth Redirect URIs: `http://localhost:3000/api/oauth/facebook/callback`
5. Copy App ID + Secret to `.env`

**Permissions needed:**
- `pages_manage_posts` (publish to Page)
- `pages_read_engagement` (read Page info)

---

## Success Criteria

✅ **MVP Complete when:**
1. User can connect YouTube account via `/connect_youtube`
2. User can connect Facebook account via `/connect_facebook`
3. User can approve draft → video uploads to YouTube as Short
4. User can approve draft → video posts to Facebook Page
5. User receives notification with URLs when publishing completes
6. If one platform fails, the other still succeeds (partial success)
7. Retrying failed job doesn't create duplicate posts (idempotency)
8. Session status updates to PUBLISHED when all jobs complete

---

## Implementation Estimate

- **Phase 1:** Interfaces - 1 hour
- **Phase 2:** YouTubePublisher - 4 hours
- **Phase 3:** FacebookPublisher - 3 hours
- **Phase 4:** worker-publish - 2 hours
- **Phase 5:** OAuth flow - 4 hours
- **Phase 6:** Notifications - 1 hour
- **Phase 7:** Idempotency - 2 hours

**Total:** ~17 hours (2-3 days with testing)

---

**Next Step:** Start with Phase 1 (Interfaces).
