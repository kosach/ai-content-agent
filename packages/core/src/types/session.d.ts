export declare enum SessionStatus {
    COLLECTING_MEDIA = "COLLECTING_MEDIA",
    ASKING_QUESTIONS = "ASKING_QUESTIONS",
    GENERATING_DRAFTS = "GENERATING_DRAFTS",
    AWAITING_APPROVAL = "AWAITING_APPROVAL",
    APPROVED = "APPROVED",
    PUBLISHING = "PUBLISHING",
    PUBLISHED = "PUBLISHED",
    CANCELLED = "CANCELLED",
    FAILED = "FAILED"
}
export declare enum MessageRole {
    USER = "USER",
    AGENT = "AGENT",
    SYSTEM = "SYSTEM"
}
export declare enum MediaType {
    PHOTO = "PHOTO",
    VIDEO = "VIDEO"
}
export declare enum DraftStatus {
    DRAFT = "DRAFT",
    APPROVED = "APPROVED",
    NEEDS_REVISION = "NEEDS_REVISION",
    PUBLISHED = "PUBLISHED",
    FAILED = "FAILED"
}
export declare enum PublishJobStatus {
    PENDING = "PENDING",
    UPLOADING = "UPLOADING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    RETRYING = "RETRYING"
}
export declare enum Platform {
    YOUTUBE = "YOUTUBE",
    FACEBOOK = "FACEBOOK"
}
export interface User {
    id: string;
    telegramId: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface BrandProfile {
    id: string;
    userId: string;
    brandName?: string;
    brandVoice?: string;
    targetAudience?: string;
    defaultHashtags: string[];
    autoPublish: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface ContentSession {
    id: string;
    brandProfileId: string;
    status: SessionStatus;
    userIntent?: string;
    tone?: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
}
export interface SessionMessage {
    id: string;
    sessionId: string;
    role: MessageRole;
    content: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}
export interface MediaAsset {
    id: string;
    sessionId: string;
    type: MediaType;
    telegramFileId: string;
    storageUrl?: string;
    filename: string;
    mimeType: string;
    fileSize: number;
    duration?: number;
    width?: number;
    height?: number;
    thumbnail?: string;
    analyzed: boolean;
    analysisResult?: Record<string, any>;
    createdAt: Date;
}
export interface DraftPackage {
    id: string;
    sessionId: string;
    youtubeTitle?: string;
    youtubeDescription?: string;
    youtubeHashtags: string[];
    facebookText?: string;
    facebookHashtags: string[];
    primaryVideoId?: string;
    primaryImageId?: string;
    version: number;
    status: DraftStatus;
    revisionRequest?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface PublishJob {
    id: string;
    sessionId: string;
    draftPackageId: string;
    platform: Platform;
    status: PublishJobStatus;
    platformPostId?: string;
    platformUrl?: string;
    error?: string;
    attempts: number;
    maxAttempts: number;
    createdAt: Date;
    updatedAt: Date;
    publishedAt?: Date;
}
export interface ConnectedAccount {
    id: string;
    brandProfileId: string;
    platform: Platform;
    platformUserId: string;
    username?: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    isActive: boolean;
    lastVerified: Date;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=session.d.ts.map