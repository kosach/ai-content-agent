"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentAgent = exports.ContentAgent = void 0;
const core_1 = require("@ai-agent/core");
const loader_1 = require("../prompts/loader");
const schemas_1 = require("../schemas");
const providers_1 = require("../providers");
const observability_1 = require("@ai-agent/observability");
class ContentAgent {
    /**
     * Determine next question based on session state
     */
    async getNextQuestion(context) {
        // No media yet - welcome message
        if (context.mediaCount === 0) {
            return {
                message: '👋 Welcome! Upload a video or photo, and I\'ll help you create:\n\n' +
                    '📹 YouTube Shorts\n' +
                    '📱 Facebook posts\n\n' +
                    'Just send your media to get started!',
            };
        }
        // Media uploaded, no intent yet
        if (!context.hasUserIntent) {
            return {
                message: '✨ Got your media!\n\n' +
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
                message: 'Great! What tone would you like?\n\n' +
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
            message: '🚀 Perfect! I have everything I need.\n\n' +
                'Generating your YouTube Short and Facebook post...',
            nextStatus: core_1.SessionStatus.GENERATING_DRAFTS,
            shouldGenerateDrafts: true,
        };
    }
    /**
     * Extract intent and tone from user's message
     */
    async extractContext(message, currentContext) {
        const extracted = {};
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
    async analyzeMedia(params) {
        observability_1.logger.info({ mediaType: params.mediaType }, 'Analyzing media with Gemini Vision');
        // Load prompt template
        const promptTemplate = await (0, loader_1.readPromptFile)('analysis/media-analyzer.prompt.md');
        // Render template with params
        const prompt = this.renderTemplate(promptTemplate, {
            mediaUrl: params.mediaUrl,
            isVideo: params.mediaType === 'VIDEO',
            duration: params.duration,
        });
        // Call Gemini Vision API
        const analysis = await providers_1.geminiVisionProvider.analyzeMedia({
            mediaUrl: params.mediaUrl,
            mediaType: params.mediaType,
            duration: params.duration,
            prompt,
        });
        observability_1.logger.info({ analysis }, 'Media analysis completed with Gemini');
        return analysis;
    }
    /**
     * Generate YouTube Short + Facebook post drafts
     */
    async generateDrafts(params) {
        observability_1.logger.info({ userIntent: params.userIntent, tone: params.tone }, 'Generating drafts with Gemini');
        // Load prompt template
        const promptTemplate = await (0, loader_1.readPromptFile)('generation/draft-generator.prompt.md');
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
        const result = await providers_1.geminiTextProvider.generateText({
            prompt,
            temperature: 0.8,
            maxTokens: 2048,
            responseFormat: 'json',
        });
        // Parse JSON response
        let drafts;
        try {
            drafts = JSON.parse(result.text);
        }
        catch (parseError) {
            observability_1.logger.error({ text: result.text, parseError }, 'Failed to parse draft generation response');
            throw new Error('Failed to parse AI response');
        }
        // Validate against schema
        const validated = schemas_1.DraftGenerationSchema.parse(drafts);
        observability_1.logger.info({ validated }, 'Draft generation completed');
        return validated;
    }
    /**
     * Process revision request from user
     */
    async processRevision(params) {
        observability_1.logger.info({ revisionRequest: params.revisionRequest }, 'Processing revision request');
        // Load prompt template
        const promptTemplate = await (0, loader_1.readPromptFile)('revision/revise-drafts.prompt.md');
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
        const result = await providers_1.geminiTextProvider.generateText({
            prompt,
            temperature: 0.8,
            maxTokens: 2048,
            responseFormat: 'json',
        });
        // Parse and validate
        let revisedDraft;
        try {
            revisedDraft = JSON.parse(result.text);
            schemas_1.DraftGenerationSchema.parse(revisedDraft);
        }
        catch (parseError) {
            observability_1.logger.error({ text: result.text, parseError }, 'Failed to parse revision response');
            throw new Error('Failed to parse AI response');
        }
        observability_1.logger.info({ revisedDraft }, 'Revision completed');
        return { revisedDraft };
    }
    /**
     * Handle approval/rejection from user
     */
    async handleApproval(message) {
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
    parseTone(message) {
        const lower = message.toLowerCase();
        const toneMap = {
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
    getSystemMessage(status) {
        const messages = {
            [core_1.SessionStatus.COLLECTING_MEDIA]: '',
            [core_1.SessionStatus.ASKING_QUESTIONS]: '',
            [core_1.SessionStatus.GENERATING_DRAFTS]: '🤖 Generating your content drafts...',
            [core_1.SessionStatus.AWAITING_APPROVAL]: '✅ Drafts ready! Review and approve.',
            [core_1.SessionStatus.APPROVED]: '✨ Approved!',
            [core_1.SessionStatus.PUBLISHING]: '🚀 Publishing to your platforms...',
            [core_1.SessionStatus.PUBLISHED]: '🎉 Successfully published!',
            [core_1.SessionStatus.CANCELLED]: '❌ Session cancelled.',
            [core_1.SessionStatus.FAILED]: '⚠️ Something went wrong. Please try again.',
        };
        return messages[status] || '';
    }
    /**
     * Simple template renderer
     * Replaces {{variable}} with values from context
     */
    renderTemplate(template, context) {
        let rendered = template;
        // Handle simple conditionals: {{#if variable}}...{{/if}}
        rendered = rendered.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, variable, content) => {
            return context[variable] ? content : '';
        });
        // Handle variable substitution: {{variable}}
        rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
            return context[variable] !== undefined ? String(context[variable]) : '';
        });
        return rendered;
    }
}
exports.ContentAgent = ContentAgent;
exports.contentAgent = new ContentAgent();
//# sourceMappingURL=content-agent.js.map