# End-to-End Test Checklist

**Goal:** Verify complete publishing workflow from Telegram upload to live posts on YouTube and Facebook.

**Prerequisites:**
- All services running (API, telegram-bot, worker-analysis, worker-generation, worker-publish)
- Redis running
- PostgreSQL running
- S3/MinIO configured and accessible
- YouTube OAuth app configured
- Facebook OAuth app configured
- `.env` file populated with all required credentials

---

## Pre-Test Setup

### 1. Environment Variables Check

```bash
# Verify all required variables are set
grep -E "YOUTUBE_CLIENT_ID|FACEBOOK_APP_ID|GOOGLE_AI_API_KEY|TELEGRAM_BOT_TOKEN|S3_BUCKET" .env
```

**Required variables:**
- ✅ `GOOGLE_AI_API_KEY` - Gemini API key
- ✅ `TELEGRAM_BOT_TOKEN` - Bot token
- ✅ `DATABASE_URL` - PostgreSQL connection
- ✅ `REDIS_HOST` - Redis host
- ✅ `S3_BUCKET` - S3 bucket name
- ✅ `S3_ACCESS_KEY` - S3 credentials
- ✅ `S3_SECRET_KEY` - S3 credentials
- ✅ `YOUTUBE_CLIENT_ID` - YouTube OAuth
- ✅ `YOUTUBE_CLIENT_SECRET` - YouTube OAuth
- ✅ `YOUTUBE_REDIRECT_URI` - OAuth callback URL
- ✅ `FACEBOOK_APP_ID` - Facebook OAuth
- ✅ `FACEBOOK_APP_SECRET` - Facebook OAuth
- ✅ `FACEBOOK_REDIRECT_URI` - OAuth callback URL
- ✅ `API_BASE_URL` - API server base URL

### 2. Start All Services

```bash
# Terminal 1: Redis
redis-server

# Terminal 2: API Server (OAuth callbacks)
cd apps/api
pnpm dev

# Terminal 3: Telegram Bot
cd apps/telegram-bot
pnpm dev

# Terminal 4: Worker Analysis
cd apps/worker-analysis
pnpm dev

# Terminal 5: Worker Generation
cd apps/worker-generation
pnpm dev

# Terminal 6: Worker Publish
cd apps/worker-publish
pnpm dev
```

**Expected startup logs:**
- API: `API server started successfully { port: 3000 }`
- Bot: `Telegram bot started successfully`
- Workers: `Worker started successfully`

### 3. Verify Services

```bash
# Check API health
curl http://localhost:3000/health

# Check Redis
redis-cli ping

# Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"User\";"
```

---

## Test 1: YouTube Success (Full Happy Path)

**Goal:** Complete flow from upload to live YouTube Short.

### Steps:

1. **Connect YouTube Account**
   ```
   User → /connect_youtube
   Bot → Sends OAuth URL
   User → Clicks URL, authorizes
   OAuth → Redirects to callback
   Bot → "✅ YouTube account connected!"
   ```

   **Verify:**
   - [ ] OAuth URL opens in browser
   - [ ] User can select YouTube channel
   - [ ] Callback page shows success
   - [ ] Telegram receives confirmation
   - [ ] Database: `ConnectedAccount` record created with `platform = YOUTUBE`

2. **Upload Video**
   ```
   User → Uploads video (<60s, <20MB)
   Bot → "Got your media! What would you like to create?"
   ```

   **Verify:**
   - [ ] Video accepted
   - [ ] `MediaAsset` created
   - [ ] `ContentSession` created with status `COLLECTING_MEDIA`
   - [ ] ANALYZE_MEDIA job enqueued

3. **Worker Analysis**
   ```
   Worker → Downloads video from Telegram
   Worker → Uploads to S3
   Worker → Calls Gemini Vision API
   Worker → Saves analysis result
   ```

   **Verify:**
   - [ ] S3: Video file exists in `media/{sessionId}/{assetId}.mp4`
   - [ ] `MediaAsset.storageUrl` populated
   - [ ] `MediaAsset.analysisResult` has topics, mood, objects
   - [ ] Bot sends question: "What would you like to create?"

4. **Conversation**
   ```
   User → "Create a tutorial"
   Bot → "What tone would you like?"
   User → "Casual and friendly"
   Bot → "Perfect! Generating your content..."
   ```

   **Verify:**
   - [ ] `ContentSession.userIntent` = "Create a tutorial"
   - [ ] `ContentSession.tone` = "Casual and friendly"
   - [ ] GENERATE_DRAFTS job enqueued

5. **Worker Generation**
   ```
   Worker → Calls Gemini Text API
   Worker → Creates DraftPackage
   Worker → Sends preview to Telegram
   ```

   **Verify:**
   - [ ] `DraftPackage` created with version = 1
   - [ ] Bot sends formatted preview with inline buttons
   - [ ] Preview shows YouTube Short (title, description, hashtags)
   - [ ] Preview shows Facebook Post (text, hashtags)

6. **Approve**
   ```
   User → Clicks "✅ Approve" button
   Bot → "Publishing to YouTube and Facebook..."
   ```

   **Verify:**
   - [ ] `DraftPackage.status` = APPROVED
   - [ ] `PublishJob` created for YOUTUBE (status = PENDING)
   - [ ] `PublishJob` created for FACEBOOK (status = PENDING)
   - [ ] PUBLISH_YOUTUBE job enqueued
   - [ ] PUBLISH_FACEBOOK job enqueued

7. **Worker Publish (YouTube)**
   ```
   Worker → Downloads video from S3
   Worker → Checks/refreshes access token
   Worker → Uploads to YouTube via API
   Worker → Updates PublishJob
   ```

   **Verify:**
   - [ ] Video uploads successfully
   - [ ] `PublishJob.status` = COMPLETED
   - [ ] `PublishJob.platformPostId` = YouTube video ID
   - [ ] `PublishJob.platformUrl` = `https://youtube.com/shorts/{videoId}`

8. **Notification**
   ```
   Bot → "🎉 Successfully published!"
   Bot → "📹 YouTube Short: [URL]"
   ```

   **Verify:**
   - [ ] User receives notification
   - [ ] `ContentSession.status` = PUBLISHED
   - [ ] YouTube URL clickable and works

9. **Verify on YouTube**
   ```
   Manual: Open YouTube Studio
   ```

   **Verify:**
   - [ ] Short appears in YouTube Studio
   - [ ] Title matches `DraftPackage.youtubeTitle`
   - [ ] Description matches `DraftPackage.youtubeDescription`
   - [ ] Hashtags present in description
   - [ ] Video is public (or privacy setting matches)

---

## Test 2: Facebook Success

**Goal:** Verify Facebook publishing works.

### Steps:

1. **Connect Facebook Account**
   ```
   User → /connect_facebook
   Bot → Sends OAuth URL
   User → Clicks URL, authorizes, selects Page
   OAuth → Redirects to callback
   Bot → "✅ Facebook account connected! Page: [Name]"
   ```

   **Verify:**
   - [ ] OAuth flow completes
   - [ ] User can select Page
   - [ ] `ConnectedAccount` created with `platform = FACEBOOK`
   - [ ] `platformUserName` = Page name

2. **Upload & Approve (same as Test 1)**

3. **Worker Publish (Facebook)**
   ```
   Worker → Uploads video to Facebook Page
   Worker → Updates PublishJob
   ```

   **Verify:**
   - [ ] Video uploads successfully
   - [ ] `PublishJob.status` = COMPLETED
   - [ ] `PublishJob.platformPostId` = Facebook post ID
   - [ ] `PublishJob.platformUrl` = Facebook post URL

4. **Notification**
   ```
   Bot → "🎉 Successfully published!"
   Bot → "📱 Facebook Post: [URL]"
   ```

5. **Verify on Facebook**
   ```
   Manual: Open Facebook Page
   ```

   **Verify:**
   - [ ] Post appears on Page
   - [ ] Video plays correctly
   - [ ] Text matches `DraftPackage.facebookText`
   - [ ] Hashtags present

---

## Test 3: Partial Success (YouTube succeeds, Facebook fails)

**Goal:** Verify graceful handling when one platform fails.

### Setup:
- Disconnect Facebook account: `/disconnect facebook`
- OR: Use invalid Facebook token (manually edit database)

### Steps:

1. Upload video, answer questions, approve draft
2. YouTube job succeeds
3. Facebook job fails (no account or invalid token)

**Verify:**
- [ ] YouTube: `PublishJob.status` = COMPLETED
- [ ] Facebook: `PublishJob.status` = FAILED
- [ ] `ContentSession.status` = PUBLISHED (at least one succeeded)
- [ ] Bot notification:
  ```
  ✅ Published to: YOUTUBE
  ❌ Failed: FACEBOOK
  YOUTUBE: https://youtube.com/shorts/...
  ```
- [ ] User can see partial success clearly

---

## Test 4: Retry After Transient Failure

**Goal:** Verify idempotency and retry handling.

### Scenario 1: Network Timeout During Upload

**Setup:**
- Kill worker-publish mid-upload (Ctrl+C)
- Restart worker-publish

**Verify:**
- [ ] Job retries automatically (BullMQ backoff)
- [ ] No duplicate video upload (check idempotency)
- [ ] `PublishJob.platformPostId` prevents re-upload if already completed
- [ ] Final status: COMPLETED (not duplicate)

### Scenario 2: Quota Exceeded (YouTube)

**Setup:**
- Manually trigger quota error (hard to test, simulate by editing code temporarily)

**Verify:**
- [ ] Job marked as PENDING (not FAILED)
- [ ] `PublishJob.errorType` = QUOTA_EXCEEDED
- [ ] Job retries next day (BullMQ scheduled retry)
- [ ] User notified about delay

---

## Test 5: Token Refresh Path

**Goal:** Verify access token refresh works correctly.

### Setup:
- Manually expire access token in database:
  ```sql
  UPDATE "ConnectedAccount"
  SET "expiresAt" = NOW() - INTERVAL '1 hour'
  WHERE platform = 'YOUTUBE';
  ```

### Steps:

1. Upload, approve draft
2. Worker attempts to publish
3. Token expired → refresh triggered
4. New token obtained
5. Upload succeeds

**Verify:**
- [ ] Worker logs: "Access token expired, refreshing"
- [ ] `ConnectedAccount.accessToken` updated with new token
- [ ] `ConnectedAccount.expiresAt` updated to future date
- [ ] Upload completes successfully
- [ ] No manual re-auth required

---

## Test 6: Revision Flow

**Goal:** Verify revision creates new draft and can be published.

### Steps:

1. Upload, approve draft
2. Click "✏️ Revise" instead of Approve
3. Bot: "What would you like me to change?"
4. User: "Make it more professional"
5. Worker generates new draft (v2)
6. Bot sends new preview
7. User clicks "✅ Approve" on v2
8. Publish succeeds

**Verify:**
- [ ] `DraftPackage` v1: status = NEEDS_REVISION
- [ ] `DraftPackage` v2: status = APPROVED, version = 2
- [ ] v2 content different from v1 (professional tone)
- [ ] PublishJobs reference v2 (not v1)
- [ ] Published content matches v2

---

## Test 7: Edge Cases

### 7.1: Video Too Long (>60s)

**Verify:**
- [ ] Worker throws error: "Video too long: 75s (max: 60s for Shorts)"
- [ ] `PublishJob.status` = FAILED
- [ ] Error message clear and actionable

### 7.2: No Connected Accounts

**Verify:**
- [ ] Approve without accounts → Error message
- [ ] Bot: "No connected accounts. /connect_youtube /connect_facebook"
- [ ] Session status = FAILED
- [ ] No jobs enqueued

### 7.3: Cancel Session

**Verify:**
- [ ] `/cancel` during any stage → session cancelled
- [ ] No further processing
- [ ] User can start new session

---

## Test 8: List Accounts

**Goal:** Verify account management commands.

### Steps:

```
User → /accounts
Bot → Shows list of connected accounts
```

**Verify:**
- [ ] Shows platform, username/page name, expiry date
- [ ] Accurate information
- [ ] If no accounts: suggests connect commands

---

## Performance Checks

### Upload to Publish Time

**Expected:**
- Analysis: < 30s
- Draft generation: < 20s
- YouTube upload: < 2 min (depending on video size)
- Facebook upload: < 1 min

**Total:** ~3-4 minutes from upload to live post

### Resource Usage

**Check during test:**
- [ ] No memory leaks (monitor worker memory)
- [ ] No CPU spikes (should be <50% most of time)
- [ ] Redis memory stable
- [ ] Database connections don't leak

---

## Final Verification

After completing all tests:

1. **Database State**
   ```sql
   -- Check session completed
   SELECT status FROM "ContentSession" ORDER BY "createdAt" DESC LIMIT 1;
   -- Should be: PUBLISHED

   -- Check publish jobs
   SELECT platform, status, "platformUrl"
   FROM "PublishJob" ORDER BY "createdAt" DESC LIMIT 2;
   -- Should be: Both COMPLETED with URLs
   ```

2. **Live Content**
   - [ ] YouTube Short is live and playable
   - [ ] Facebook Post is live and playable
   - [ ] Content matches approved drafts
   - [ ] Hashtags work (clickable on platforms)

3. **Logs**
   - [ ] No unexpected errors in any worker
   - [ ] All jobs processed successfully
   - [ ] Token refresh logged (if triggered)

4. **Cleanup**
   - [ ] All temporary files deleted from S3
   - [ ] Redis job data cleaned (BullMQ auto-cleanup)
   - [ ] No zombie processes

---

## Success Criteria

✅ **MVP is functionally complete when:**

1. User can upload video → receive AI-generated drafts
2. User can approve → video publishes to YouTube as Short
3. User can approve → video publishes to Facebook Page
4. User receives confirmation with clickable URLs
5. Partial success handled gracefully (one fails, other succeeds)
6. Retries work without creating duplicates (idempotency)
7. Token refresh works transparently (no re-auth needed)
8. All edge cases handled with clear error messages

---

## Troubleshooting Guide

### OAuth Not Working

**Symptoms:** Callback fails, "Invalid state" error

**Check:**
- API server running on correct port
- Redirect URI matches exactly (no trailing slash)
- OAuth app configured correctly (client ID/secret)
- State not expired (10 min TTL)

### Video Upload Fails

**Symptoms:** "Failed to upload to YouTube/Facebook"

**Check:**
- Access token valid (check `expiresAt`)
- Video format supported (mp4 recommended)
- Video size < limits (YouTube: 256MB, Facebook: 10GB)
- Permissions granted (upload scope)

### Worker Not Processing

**Symptoms:** Jobs sit in queue, status never changes

**Check:**
- Worker running (`ps aux | grep worker-publish`)
- Redis connected
- Database connected
- Logs show job processing started

### Gemini API Errors

**Symptoms:** Analysis or draft generation fails

**Check:**
- API key valid
- Quota not exceeded (15 RPM limit)
- Internet connection stable
- Prompt files exist and are valid

---

**Ready to test!** 🚀

Start with Test 1 (YouTube Success) and work through the checklist systematically.
