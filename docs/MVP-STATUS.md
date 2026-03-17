# MVP Status - AI Content Agent

**Last Updated:** 2026-03-15 18:38 GMT+1

## ✅ Completed

### 1. Database Schema (Final)

**8 Models:**

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `User` | Telegram user | telegramId, username, firstName |
| `BrandProfile` | Brand settings | brandVoice, targetAudience, defaultHashtags, autoPublish |
| `ContentSession` | Conversation lifecycle | status, userIntent, tone |
| `SessionMessage` | Conversation history | role (USER/AGENT/SYSTEM), content |
| `MediaAsset` | Uploaded media | type (PHOTO/VIDEO), telegramFileId, storageUrl, analysisResult |
| `DraftPackage` | Generated drafts | youtubeTitle/Description/Hashtags, facebookText/Hashtags |
| `PublishJob` | Platform publishing | platform (YOUTUBE/FACEBOOK), status, platformPostId/Url |
| `ConnectedAccount` | OAuth credentials | platform, accessToken, refreshToken, expiresAt |

**Enums:**
- SessionStatus: COLLECTING_MEDIA → ASKING_QUESTIONS → GENERATING_DRAFTS → AWAITING_APPROVAL → PUBLISHING → PUBLISHED
- MessageRole: USER, AGENT, SYSTEM
- MediaType: PHOTO, VIDEO
- DraftStatus: DRAFT, APPROVED, NEEDS_REVISION, PUBLISHED
- PublishJobStatus: PENDING, UPLOADING, COMPLETED, FAILED
- Platform: YOUTUBE, FACEBOOK

### 2. AI Agent Layer (packages/ai)

**Structure:**
```
packages/ai/src/
├── agents/
│   └── content-agent.ts      # ContentAgent orchestration
├── prompts/
│   ├── loader.ts              # Template loading + rendering
│   ├── analysis/
│   │   └── media-analyzer.prompt.md
│   └── generation/
│       └── draft-generator.prompt.md
├── schemas/
│   └── index.ts               # Zod validation schemas
├── tools/                     # (reserved)
├── memory/                    # (reserved)
└── index.ts                   # Package exports
```

**ContentAgent Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `getNextQuestion()` | Determine next question based on session state | AgentResponse with message & nextStatus |
| `extractContext()` | Parse user intent & tone from message | { userIntent?, tone? } |
| `analyzeMedia()` | AI analysis of uploaded media | MediaAnalysis (topics, mood, objects, title) |
| `generateDrafts()` | Generate YouTube Short + Facebook post | DraftGeneration |
| `processRevision()` | Handle user revision request | { revisedDraft } |
| `handleApproval()` | Check if user approved or requested changes | { approved, revisionRequest? } |

**Schemas (Zod):**
- `MediaAnalysisSchema` - validates AI analysis output
- `DraftGenerationSchema` - validates generated drafts
- `RevisionRequestSchema` - validates revision requests

### 3. Queue Payloads (Fixed)

**Type-Safe Job Data:**

```typescript
// ANALYZE_MEDIA
interface AnalyzeMediaJobData {
  sessionId: string;
  brandProfileId: string;
  mediaAssetId: string;
  mediaType: 'PHOTO' | 'VIDEO';
  telegramFileId: string;
}

// GENERATE_DRAFTS
interface GenerateDraftsJobData {
  sessionId: string;
  brandProfileId: string;
  userIntent: string;
  tone: string;
  mediaAnalysis: MediaAnalysis;
}

// PUBLISH_YOUTUBE / PUBLISH_FACEBOOK
interface PublishYouTubeJobData {
  sessionId: string;
  brandProfileId: string;
  draftPackageId: string;
  publishJobId: string;
  connectedAccountId: string;
}
```

**No more payload mismatches!** Telegram bot and workers use the same typed interfaces.

### 4. Telegram Bot (Rewritten)

**Handlers:**

| Handler | Flow |
|---------|------|
| `/start` | Create User + BrandProfile → Welcome message |
| `photo` | → handleMediaUpload → Save MediaAsset → Enqueue ANALYZE_MEDIA → Ask questions |
| `video` | → handleMediaUpload → Save MediaAsset → Enqueue ANALYZE_MEDIA → Ask questions |
| `text` | → If ASKING_QUESTIONS: extractContext → update session → getNextQuestion<br>→ If AWAITING_APPROVAL: handleApproval → publish or revise |
| `/cancel` | Cancel active session |
| `/status` | Show session status + media count + drafts count |

**Session Flow:**

```
1. User uploads photo/video
   ↓
2. Create/resume ContentSession (status: COLLECTING_MEDIA)
   ↓
3. Save MediaAsset (telegramFileId)
   ↓
4. Enqueue ANALYZE_MEDIA job
   ↓
5. Status → ASKING_QUESTIONS
   ↓
6. ContentAgent.getNextQuestion() → "What would you like to create?"
   ↓
7. User answers (intent)
   ↓
8. ContentAgent.extractContext() → save userIntent
   ↓
9. ContentAgent.getNextQuestion() → "What tone?"
   ↓
10. User answers (tone)
    ↓
11. ContentAgent.extractContext() → save tone
    ↓
12. Status → GENERATING_DRAFTS
    ↓
13. Enqueue GENERATE_DRAFTS job
    ↓
14. Worker creates DraftPackage
    ↓
15. Status → AWAITING_APPROVAL
    ↓
16. Bot presents drafts
    ↓
17. User: "approve" or "change X"
    ↓
18. If approved: Status → APPROVED → Enqueue PUBLISH jobs
    If revision: Status → NEEDS_REVISION → regenerate
```

**THIN HANDLERS:** No business logic. Only:
- Database operations
- Queue job enqueueing
- ContentAgent method calls
- Reply to user

### 5. Core Types (Updated)

**All types aligned with Prisma schema:**
- User
- BrandProfile
- ContentSession
- SessionMessage
- MediaAsset
- DraftPackage
- PublishJob
- ConnectedAccount

**Job payloads:** AnalyzeMediaJobData, GenerateDraftsJobData, PublishYouTubeJobData, PublishFacebookJobData

## 🚧 TODO (Implementation)

### Priority 1: Core Flow

- [ ] **Telegram file download service**
  - Download photos/videos from Telegram Bot API
  - Handle file size limits
  - Error handling

- [ ] **S3 storage upload**
  - Upload media to S3/MinIO
  - Generate signed URLs
  - Thumbnail generation for videos

- [ ] **AI integration (OpenClaw/Gemini)**
  - Implement `contentAgent.analyzeMedia()` with real AI
  - Vision API for photos
  - Video understanding for videos
  - Audio transcription

### Priority 2: Draft Generation

- [ ] **worker-generation implementation**
  - Process GENERATE_DRAFTS jobs
  - Call `contentAgent.generateDrafts()`
  - Create DraftPackage in database
  - Notify user (Telegram message)

- [ ] **Draft presentation in Telegram**
  - Format YouTube Short preview
  - Format Facebook post preview
  - Inline keyboard: Approve / Revise / Cancel

### Priority 3: Publishing

- [ ] **YouTube OAuth flow**
  - OAuth 2.0 setup
  - Save ConnectedAccount
  - Refresh token handling

- [ ] **Facebook OAuth flow**
  - OAuth 2.0 setup
  - Page selection
  - Save ConnectedAccount

- [ ] **worker-publish YouTube**
  - Process PUBLISH_YOUTUBE jobs
  - Upload video as Short
  - Set title, description, hashtags
  - Update PublishJob with result

- [ ] **worker-publish Facebook**
  - Process PUBLISH_FACEBOOK jobs
  - Create post with media
  - Set text, hashtags
  - Update PublishJob with result

### Priority 4: Revision Flow

- [ ] **Implement revision regeneration**
  - `contentAgent.processRevision()`
  - Update DraftPackage (version++)
  - Re-present to user

- [ ] **Conversation memory**
  - Store session context in memory/
  - Use for better AI responses
  - Track revision history

## 📊 Architecture Status

| Component | Status | Notes |
|-----------|--------|-------|
| Database Schema | ✅ Complete | 8 models, all enums defined |
| AI Agent Layer | ✅ Complete | ContentAgent with 6 methods |
| Queue Payloads | ✅ Fixed | Type-safe interfaces |
| Telegram Bot | ✅ Complete | Media upload + conversation flow |
| worker-analysis | ⚠️ Partial | Structure ready, needs AI integration |
| worker-generation | ❌ Not started | Needs implementation |
| worker-publish | ❌ Not started | Needs YouTube + Facebook APIs |
| Storage Service | ❌ Not started | Needs S3/MinIO client |
| OAuth Flow | ❌ Not started | Needs YouTube + Facebook setup |

## 🎯 MVP Definition

**What IS in MVP:**
- Upload video/photo to Telegram ✅
- AI asks clarifying questions ✅
- Generate YouTube Short (title, description, hashtags) 🚧
- Generate Facebook post (text, hashtags) 🚧
- User approves or revises ✅
- Publish to YouTube & Facebook ❌

**What is NOT in MVP:**
- Other platforms (Twitter, Instagram, TikTok)
- Media generation/rendering
- Advanced scheduling
- Multi-user collaboration
- Analytics/reporting

## 📝 Commits

| Commit | Description |
|--------|-------------|
| `57aba9e` | Initial monorepo scaffold |
| `544d463` | Redesign for MVP - YouTube + Facebook |
| `66be0b7` | MVP alignment - session flow + AI agent + payloads ← **CURRENT** |

## 🔗 Links

- **GitHub:** https://github.com/kosach/ai-content-agent
- **Commit:** https://github.com/kosach/ai-content-agent/commit/66be0b7

---

**Next Session Start Here:** Implement Telegram file download → S3 upload → AI analysis integration.
