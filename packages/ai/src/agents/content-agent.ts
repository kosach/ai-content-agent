import { SessionStatus } from '@ai-agent/core';
import { readPromptFile } from '../prompts/loader';
import { MediaAnalysisSchema, DraftGenerationSchema } from '../schemas';
import { geminiVisionProvider, geminiTextProvider } from '../providers';
import { logger } from '@ai-agent/observability';

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
    logger.info({ mediaType: params.mediaType }, 'Analyzing media with Gemini Vision');

    // Load prompt template
    const promptTemplate = await readPromptFile('analysis/media-analyzer.prompt.md');

    // Render template with params
    const prompt = this.renderTemplate(promptTemplate, {
      mediaUrl: params.mediaUrl,
      isVideo: params.mediaType === 'VIDEO',
      duration: params.duration,
    });

    // Call Gemini Vision API
    const analysis = await geminiVisionProvider.analyzeMedia({
      mediaUrl: params.mediaUrl,
      mediaType: params.mediaType,
      duration: params.duration,
      prompt,
    });

    logger.info({ analysis }, 'Media analysis completed with Gemini');

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
    logger.info(
      { userIntent: params.userIntent, tone: params.tone },
      'Generating drafts with Gemini'
    );

    // Load prompt template
    const promptTemplate = await readPromptFile('generation/draft-generator.prompt.md');

    // Render template with context
    const prompt = this.renderTemplate(promptTemplate, {
      userIntent: params.userIntent,
      tone: params.tone,
      topics: params.mediaAnalysis.topics?.join(', ') || '',
      mood: params.mediaAnalysis.mood || 'neutral',
      contentType: params.mediaAnalysis.contentType || 'general',
      targetAudience: params.mediaAnalysis.targetAudience || 'general',
      brandVoice: params.brandVoice || 'authentic and engaging',
      brandHashtags: params.brandHashtags?.join(', ') || '',
    });

    // Call Gemini Text API
    let result;
    try {
      result = await geminiTextProvider.generateText({
        prompt,
        temperature: 0.8,
        maxTokens: 2048,
        responseFormat: 'json',
      });
      logger.info({ textLength: result.text.length }, 'Gemini API response received');
    } catch (apiError: any) {
      logger.error({ 
        error: apiError, 
        message: apiError?.message, 
        stack: apiError?.stack,
        cause: apiError?.cause 
      }, 'Gemini API call failed');
      throw new Error(`Gemini API failed: ${apiError?.message || 'Unknown error'}`);
    }

    // Parse JSON response
    let drafts: any;
    try {
      drafts = JSON.parse(result.text);
    } catch (parseError: any) {
      logger.error({ text: result.text, parseError, message: parseError?.message }, 'Failed to parse draft generation response');
      throw new Error('Failed to parse AI response');
    }

    // Validate against schema
    let validated;
    try {
      validated = DraftGenerationSchema.parse(drafts);
    } catch (validationError: any) {
      logger.error({ drafts, validationError, message: validationError?.message }, 'Schema validation failed');
      throw new Error(`Schema validation failed: ${validationError?.message || 'Unknown error'}`);
    }

    logger.info({ validated }, 'Draft generation completed');

    return validated;
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
    logger.info({ revisionRequest: params.revisionRequest }, 'Processing revision request');

    // Load prompt template
    const promptTemplate = await readPromptFile('revision/revise-drafts.prompt.md');

    // Render template with context
    const prompt = this.renderTemplate(promptTemplate, {
      originalYoutubeTitle: params.currentDraft.youtubeShort.title,
      originalYoutubeDescription: params.currentDraft.youtubeShort.description,
      originalYoutubeHashtags: params.currentDraft.youtubeShort.hashtags.join(', '),
      originalFacebookText: params.currentDraft.facebookPost.text,
      originalFacebookHashtags: params.currentDraft.facebookPost.hashtags.join(', '),
      userFeedback: params.revisionRequest,
      userIntent: params.originalContext.userIntent || '',
      tone: params.originalContext.tone || '',
      topics: params.originalContext.topics || '',
      targetAudience: params.originalContext.targetAudience || '',
    });

    // Call Gemini Text API
    const result = await geminiTextProvider.generateText({
      prompt,
      temperature: 0.8,
      maxTokens: 2048,
      responseFormat: 'json',
    });

    // Parse and validate
    let revisedDraft: any;
    try {
      revisedDraft = JSON.parse(result.text);
      DraftGenerationSchema.parse(revisedDraft);
    } catch (parseError) {
      logger.error({ text: result.text, parseError }, 'Failed to parse revision response');
      throw new Error('Failed to parse AI response');
    }

    logger.info({ revisedDraft }, 'Revision completed');

    return { revisedDraft };
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

    const toneMap: Record<string, string[]> = {
      professional: ['professional', 'formal', 'business'],
      casual: ['casual', 'friendly', 'relaxed'],
      funny: ['funny', 'humor', 'entertaining'],
      inspiring: ['inspiring', 'motivational', 'uplifting'],
      educational: ['educational', 'teaching', 'informative'],
    };

    for (const [tone, keywords] of Object.entries(toneMap)) {
      if (keywords.some((kw: string) => lower.includes(kw))) {
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

  /**
   * Simple template renderer
   * Replaces {{variable}} with values from context
   */
  private renderTemplate(template: string, context: Record<string, any>): string {
    let rendered = template;

    // Handle simple conditionals: {{#if variable}}...{{/if}}
    rendered = rendered.replace(
      /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, variable, content) => {
        return context[variable] ? content : '';
      }
    );

    // Handle variable substitution: {{variable}}
    rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return context[variable] !== undefined ? String(context[variable]) : '';
    });

    return rendered;
  }
}

export const contentAgent = new ContentAgent();
