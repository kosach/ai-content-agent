import { SessionStatus, SessionMessage, MessageRole } from '@ai-agent/core';

/**
 * Conversation Agent - orchestrates the session lifecycle
 * 
 * Responsibilities:
 * - Determine next question to ask user
 * - Decide when enough context is gathered
 * - Trigger draft generation when ready
 * - Handle approval/revision flow
 */

export interface ConversationContext {
  sessionId: string;
  status: SessionStatus;
  messages: SessionMessage[];
  mediaCount: number;
  hasUserIntent: boolean;
  hasTargetPlatforms: boolean;
  hasTone: boolean;
}

export interface AgentResponse {
  message: string;
  nextStatus?: SessionStatus;
  shouldGenerateDrafts?: boolean;
}

export class ConversationAgent {
  /**
   * Determine what to ask next based on session context
   */
  async getNextQuestion(context: ConversationContext): Promise<AgentResponse> {
    // If no media uploaded yet
    if (context.mediaCount === 0) {
      return {
        message:
          'Welcome! 👋\n\n' +
          'Upload a video or photo, and I\'ll help you create:\n' +
          '📹 YouTube Shorts\n' +
          '📱 Facebook posts\n\n' +
          'Just send your media to get started!',
      };
    }

    // Media uploaded, ask for intent if missing
    if (!context.hasUserIntent) {
      return {
        message:
          'Great! I received your media. 📸\n\n' +
          'What would you like to create with this?\n' +
          '(e.g., "Promote my new product", "Share a tutorial", "Tell a story")',
      };
    }

    // Has intent, ask for tone if missing
    if (!context.hasTone) {
      return {
        message:
          'Got it! What tone would you like?\n\n' +
          '• Professional\n' +
          '• Casual & friendly\n' +
          '• Funny & engaging\n' +
          '• Inspiring\n' +
          '• Educational\n\n' +
          'Or describe your own style!',
      };
    }

    // Has everything, ready to generate
    return {
      message:
        'Perfect! I have everything I need. ✨\n\n' +
        'Generating your YouTube Short and Facebook post...',
      nextStatus: SessionStatus.GENERATING_DRAFTS,
      shouldGenerateDrafts: true,
    };
  }

  /**
   * Process user's answer and extract context
   */
  async processUserResponse(
    message: string,
    context: ConversationContext
  ): Promise<{
    userIntent?: string;
    tone?: string;
    targetPlatforms?: string[];
  }> {
    // This would use AI to extract structured data from user's message
    // For MVP, we can use simple keyword matching or call OpenAI/Gemini
    
    const extracted: {
      userIntent?: string;
      tone?: string;
      targetPlatforms?: string[];
    } = {};

    // Extract intent (what user wants to create)
    if (!context.hasUserIntent) {
      extracted.userIntent = message; // Store raw intent for now
      extracted.targetPlatforms = ['YOUTUBE', 'FACEBOOK']; // Default to both
    }

    // Extract tone
    if (context.hasUserIntent && !context.hasTone) {
      extracted.tone = this.extractTone(message);
    }

    return extracted;
  }

  /**
   * Handle approval/revision flow
   */
  async handleApprovalResponse(
    message: string
  ): Promise<{
    approved: boolean;
    revisionRequest?: string;
  }> {
    const lowerMessage = message.toLowerCase();

    // Approval keywords
    if (
      lowerMessage.includes('approve') ||
      lowerMessage.includes('publish') ||
      lowerMessage.includes('yes') ||
      lowerMessage.includes('good') ||
      lowerMessage.includes('perfect')
    ) {
      return { approved: true };
    }

    // Revision request
    return {
      approved: false,
      revisionRequest: message,
    };
  }

  private extractTone(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('professional') || lowerMessage.includes('formal')) {
      return 'professional';
    }
    if (lowerMessage.includes('casual') || lowerMessage.includes('friendly')) {
      return 'casual';
    }
    if (lowerMessage.includes('funny') || lowerMessage.includes('humor')) {
      return 'funny';
    }
    if (lowerMessage.includes('inspir')) {
      return 'inspiring';
    }
    if (lowerMessage.includes('educat') || lowerMessage.includes('teach')) {
      return 'educational';
    }

    // Default or use the message as custom tone
    return message.length < 50 ? message : 'engaging';
  }

  /**
   * Generate system message for status transitions
   */
  getSystemMessage(status: SessionStatus): string {
    switch (status) {
      case SessionStatus.GENERATING_DRAFTS:
        return '🤖 Generating your content drafts...';
      case SessionStatus.AWAITING_APPROVAL:
        return '✅ Drafts ready! Review and approve or request changes.';
      case SessionStatus.PUBLISHING:
        return '🚀 Publishing to your platforms...';
      case SessionStatus.PUBLISHED:
        return '🎉 Successfully published!';
      case SessionStatus.FAILED:
        return '❌ Something went wrong. Please try again or contact support.';
      default:
        return '';
    }
  }
}

export const conversationAgent = new ConversationAgent();
