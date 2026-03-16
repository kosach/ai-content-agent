-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('COLLECTING_MEDIA', 'ASKING_QUESTIONS', 'GENERATING_DRAFTS', 'AWAITING_APPROVAL', 'APPROVED', 'PUBLISHING', 'PUBLISHED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('PHOTO', 'VIDEO');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('DRAFT', 'APPROVED', 'NEEDS_REVISION', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "PublishJobStatus" AS ENUM ('PENDING', 'UPLOADING', 'COMPLETED', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('YOUTUBE', 'FACEBOOK');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandName" TEXT,
    "brandVoice" TEXT,
    "targetAudience" TEXT,
    "defaultHashtags" TEXT[],
    "autoPublish" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_sessions" (
    "id" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'COLLECTING_MEDIA',
    "userIntent" TEXT,
    "tone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "content_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "telegramFileId" TEXT NOT NULL,
    "storageUrl" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "duration" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "thumbnail" TEXT,
    "analyzed" BOOLEAN NOT NULL DEFAULT false,
    "analysisResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_packages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "youtubeTitle" TEXT,
    "youtubeDescription" TEXT,
    "youtubeHashtags" TEXT[],
    "facebookText" TEXT,
    "facebookHashtags" TEXT[],
    "primaryVideoId" TEXT,
    "primaryImageId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DraftStatus" NOT NULL DEFAULT 'DRAFT',
    "revisionRequest" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_jobs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "draftPackageId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "status" "PublishJobStatus" NOT NULL DEFAULT 'PENDING',
    "platformPostId" TEXT,
    "platformUrl" TEXT,
    "errorMessage" TEXT,
    "errorType" TEXT,
    "errorStack" TEXT,
    "retryAfter" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "publish_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connected_accounts" (
    "id" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "platformUserName" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastVerified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connected_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegramId_key" ON "users"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "brand_profiles_userId_key" ON "brand_profiles"("userId");

-- CreateIndex
CREATE INDEX "content_sessions_brandProfileId_idx" ON "content_sessions"("brandProfileId");

-- CreateIndex
CREATE INDEX "content_sessions_status_idx" ON "content_sessions"("status");

-- CreateIndex
CREATE INDEX "content_sessions_createdAt_idx" ON "content_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "session_messages_sessionId_idx" ON "session_messages"("sessionId");

-- CreateIndex
CREATE INDEX "session_messages_createdAt_idx" ON "session_messages"("createdAt");

-- CreateIndex
CREATE INDEX "media_assets_sessionId_idx" ON "media_assets"("sessionId");

-- CreateIndex
CREATE INDEX "media_assets_telegramFileId_idx" ON "media_assets"("telegramFileId");

-- CreateIndex
CREATE INDEX "draft_packages_sessionId_idx" ON "draft_packages"("sessionId");

-- CreateIndex
CREATE INDEX "draft_packages_status_idx" ON "draft_packages"("status");

-- CreateIndex
CREATE INDEX "publish_jobs_sessionId_idx" ON "publish_jobs"("sessionId");

-- CreateIndex
CREATE INDEX "publish_jobs_status_idx" ON "publish_jobs"("status");

-- CreateIndex
CREATE INDEX "publish_jobs_platform_idx" ON "publish_jobs"("platform");

-- CreateIndex
CREATE INDEX "connected_accounts_brandProfileId_idx" ON "connected_accounts"("brandProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "connected_accounts_brandProfileId_platform_key" ON "connected_accounts"("brandProfileId", "platform");

-- AddForeignKey
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_sessions" ADD CONSTRAINT "content_sessions_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "brand_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_messages" ADD CONSTRAINT "session_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "content_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "content_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_packages" ADD CONSTRAINT "draft_packages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "content_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_jobs" ADD CONSTRAINT "publish_jobs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "content_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "brand_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
