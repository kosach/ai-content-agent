import { SessionStatus } from '@ai-agent/core';
/**
 * Content Agent - orchestrates the session lifecycle
 *
 * Uses OpenClaw/Gemini for:
 * - Analyzing uploaded media
 * - Generating YouTube Short + Facebook post drafts
 * - Processing user feedback for revisions
 *
 * This is the central AI orchestration layer.
 */
export interface SessionContext {
    sessionId: string;
    status: SessionStatus;
    mediaCount: number;
    hasUserIntent: boolean;
    hasTone: boolean;
    messages: Array<{
        role: string;
        content: string;
    }>;
}
export interface AgentResponse {
    message: string;
    nextStatus?: SessionStatus;
    shouldGenerateDrafts?: boolean;
}
export declare class ContentAgent {
    /**
     * Determine next question based on session state
     */
    getNextQuestion(context: SessionContext): Promise<AgentResponse>;
    /**
     * Extract intent and tone from user's message
     */
    extractContext(message: string, currentContext: SessionContext): Promise<{
        userIntent?: string;
        tone?: string;
    }>;
    /**
     * Analyze uploaded media using AI
     */
    analyzeMedia(params: {
        mediaType: 'PHOTO' | 'VIDEO';
        mediaUrl: string;
        duration?: number;
    }): Promise<{
        topics: string[];
        mood: string;
        objects: string[];
        suggestedTitle: string;
        contentType: string;
        targetAudience: string;
        keyMoments?: Array<{
            timestamp: string;
            description: string;
        }>;
    }>;
    /**
     * Generate YouTube Short + Facebook post drafts
     */
    generateDrafts(params: {
        mediaAnalysis: any;
        userIntent: string;
        tone: string;
        brandVoice?: string;
        brandHashtags?: string[];
    }): Promise<{
        youtubeShort: {
            title: string;
            description: string;
            hashtags: string[];
        };
        facebookPost: {
            text: string;
            hashtags: string[];
        };
    }>;
    /**
     * Process revision request from user
     */
    processRevision(params: {
        currentDraft: any;
        revisionRequest: string;
        originalContext: any;
    }): Promise<{
        revisedDraft: any;
    }>;
    /**
     * Handle approval/rejection from user
     */
    handleApproval(message: string): Promise<{
        approved: boolean;
        revisionRequest?: string;
    }>;
    private parseTone;
    /**
     * Get system notification message for status changes
     */
    getSystemMessage(status: SessionStatus): string;
    /**
     * Simple template renderer
     * Replaces {{variable}} with values from context
     */
    private renderTemplate;
}
export declare const contentAgent: ContentAgent;
//# sourceMappingURL=content-agent.d.ts.map