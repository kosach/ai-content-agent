import { SessionStatus } from '@ai-agent/core';
import { readPromptFile } from '../prompts/loader';
import { MediaAnalysisSchema, DraftGenerationSchema } from '../schemas';

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
  messages: Array<{ role: string; content: string }>;
}

export interface AgentResponse {
  message: string;
  nextStatus?: SessionStatus;
  shouldGenerateDrafts?: boolean;
}

export class ContentAgent {
  /**
   * Determine next question based on session state
   */
  async getNextQuestion(context: SessionContext): Promise<AgentResponse> {
    // No media yet - welcome message
    if (context.mediaCount === 0) {
      return {
        message:
          '👋 Welcome! Upload a video or photo, and I\'ll help you create:\n\n' +
          '📹 YouTube Shorts\n' +
          '📱 Facebook posts\n\n' +
          'Just send your media to get started!',
      };
    }

    // Media uploaded, no intent yet
    if (!context.hasUserIntent) {
      return {
        message:
          '✨ Got your media!\n\n' +
          'What would you like to create with this?\n\n' +
          'For example:\n' +
          '• "Promote my new product"\n' +
          '• "Share a tutorial"\n' +
          '• "Tell my brand story"\n' +
          '• "Announce an event"',
      };
    }

    // Has intent, ask for tone
    if (!context.hasTone) {
      return {
        message:
          'Great! What tone would you like?\n\n' +
          '🎯 Professional\n' +
          '😊 Casual & friendly\n' +
          '😂 Funny & engaging\n' +
          '✨ Inspiring\n' +
          '📚 Educational\n\n' +
          'Or describe your own style!',
      };
    }

    // Ready to generate
    return {
      message:
        '🚀 Perfect! I have everything I need.\n\n' +
        'Generating your YouTube Short and Facebook post...',
      nextStatus: SessionStatus.GENERATING_DRAFTS,
      shouldGenerateDrafts: true,
    };
  }

  /**
   * Extract intent and tone from user's message
   */
  async extractContext(
    message: string,
    currentContext: SessionContext
  ): Promise<{
    userIntent?: string;
    tone?: string;
  }> {
    const extracted: { userIntent?: string; tone?: string } = {};

    // Extract intent (first text message after media upload)
    if (!currentContext.hasUserIntent) {
      extracted.userIntent = message.trim();
    }

    // Extract tone (second text message)
    if (currentContext.hasUserIntent && !currentContext.hasTone) {
      extracted.tone = this.parseTone(message);
    }

    return extracted;
  }

  /**
   * Analyze uploaded media using AI
   */
  async analyzeMedia(params: {
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
    keyMoments?: Array<{ timestamp: string; description: string }>;
  }> {
    const prompt = await readPromptFile('analysis/media-analyzer.prompt.md');

    // TODO: Call OpenClaw/Gemini with vision capabilities
    // For now, return mock data
    const analysis = {
      topics: ['tutorial', 'product showcase'],
      mood: 'professional',
      objects: ['person', 'product', 'background'],
      suggestedTitle: 'How to Get Started',
      contentType: 'tutorial',
      targetAudience: 'beginners',
    };

    // Validate against schema
    MediaAnalysisSchema.parse(analysis);

    return analysis;
  }

  /**
   * Generate YouTube Short + Facebook post drafts
   */
  async generateDrafts(params: {
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
  }> {
    const prompt = await readPromptFile('generation/draft-generator.prompt.md');

    // TODO: Call OpenClaw/Gemini with prompt template
    // Template variables: mediaAnalysis, userIntent, tone, brandVoice
    
    const drafts = {
      youtubeShort: {
        title: '🚀 How to Get Started - Complete Tutorial',
        description:
          'Learn everything you need to know!\n\n' +
          'In this video:\n' +
          '✅ Step by step guide\n' +
          '✅ Pro tips\n' +
          '✅ Common mistakes to avoid\n\n' +
          '#tutorial #howto #learn',
        hashtags: ['tutorial', 'howto', 'learn', 'guide', 'tips'],
      },
      facebookPost: {
        text:
          '🚀 Want to learn how to get started?\n\n' +
          'Check out this quick tutorial! Everything you need in 60 seconds.\n\n' +
          'Watch now! 👇',
        hashtags: ['tutorial', 'learning', 'tips'],
      },
    };

    // Validate against schema
    DraftGenerationSchema.parse(drafts);

    return drafts;
  }

  /**
   * Process revision request from user
   */
  async processRevision(params: {
    currentDraft: any;
    revisionRequest: string;
    originalContext: any;
  }): Promise<{
    revisedDraft: any;
  }> {
    // TODO: Call OpenClaw/Gemini to revise draft based on feedback
    
    // For now, return current draft (no-op)
    return {
      revisedDraft: params.currentDraft,
    };
  }

  /**
   * Handle approval/rejection from user
   */
  async handleApproval(message: string): Promise<{
    approved: boolean;
    revisionRequest?: string;
  }> {
    const lower = message.toLowerCase();

    // Approval keywords
    const approvalKeywords = [
      'approve',
      'publish',
      'yes',
      'good',
      'perfect',
      'looks great',
      'go ahead',
    ];

    const isApproval = approvalKeywords.some((kw) => lower.includes(kw));

    if (isApproval) {
      return { approved: true };
    }

    // Revision request
    return {
      approved: false,
      revisionRequest: message,
    };
  }

  private parseTone(message: string): string {
    const lower = message.toLowerCase();

    const toneMap: Record<string, string> = {
      professional: ['professional', 'formal', 'business'],
      casual: ['casual', 'friendly', 'relaxed'],
      funny: ['funny', 'humor', 'entertaining'],
      inspiring: ['inspiring', 'motivational', 'uplifting'],
      educational: ['educational', 'teaching', 'informative'],
    };

    for (const [tone, keywords] of Object.entries(toneMap)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        return tone;
      }
    }

    // If user typed something short, use as custom tone
    return message.length < 30 ? message : 'engaging';
  }

  /**
   * Get system notification message for status changes
   */
  getSystemMessage(status: SessionStatus): string {
    const messages: Record<SessionStatus, string> = {
      [SessionStatus.COLLECTING_MEDIA]: '',
      [SessionStatus.ASKING_QUESTIONS]: '',
      [SessionStatus.GENERATING_DRAFTS]: '🤖 Generating your content drafts...',
      [SessionStatus.AWAITING_APPROVAL]: '✅ Drafts ready! Review and approve.',
      [SessionStatus.APPROVED]: '✨ Approved!',
      [SessionStatus.PUBLISHING]: '🚀 Publishing to your platforms...',
      [SessionStatus.PUBLISHED]: '🎉 Successfully published!',
      [SessionStatus.CANCELLED]: '❌ Session cancelled.',
      [SessionStatus.FAILED]: '⚠️ Something went wrong. Please try again.',
    };

    return messages[status] || '';
  }
}

export const contentAgent = new ContentAgent();
