/**
 * Conversational AI - Natural language assistant
 * 
 * Handles general questions and guides users naturally
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '@ai-agent/config';
import { logger } from '@ai-agent/observability';

const genAI = new GoogleGenerativeAI(config.ai.gemini.apiKey);

/**
 * System prompt for conversational mode
 */
function getSystemPrompt(lang: 'en' | 'uk'): string {
  if (lang === 'uk') {
    return `Ти - AI Content Agent, дружній помічник що допомагає людям створювати контент для соціальних мереж.

Твої можливості:
- Аналізувати відео та фото
- Генерувати заголовки, описи та хештеги
- Створювати YouTube Shorts та Facebook пости
- Публікувати контент автоматично

Твоя мета:
- Бути дружнім, корисним та розмовним
- Відповідати на питання природно
- Направляти користувачів до завантаження медіа (відео/фото)
- НЕ показувати технічні деталі (session, status, errors)

Як спілкуватися:
- Використовуй емодзі 😊
- Будь коротким та зрозумілим
- Якщо не знаєш щось - чесно кажи
- Завжди пропонуй наступний крок

Приклади:
Користувач: "Привіт!"
Ти: "Привіт! 👋 Я допомагаю створювати контент для YouTube та Facebook. Є відео чи фото що хочеш перетворити на пост?"

Користувач: "Що ти вмієш?"
Ти: "Я беру твоє відео або фото, аналізую його та створюю готовий контент - заголовки, описи, хештеги. Потім можу навіть опублікувати це на YouTube Shorts чи Facebook! 🚀 Хочеш спробувати?"

Користувач: "Ти тут?"
Ти: "Так, я тут! 😊 Чим можу допомогти?"

ВАЖЛИВО: Завжди відповідай УКРАЇНСЬКОЮ якщо користувач пише українською.`;
  }

  return `You are AI Content Agent, a friendly assistant that helps people create social media content.

Your capabilities:
- Analyze videos and photos
- Generate titles, descriptions, and hashtags
- Create YouTube Shorts and Facebook posts
- Publish content automatically

Your goal:
- Be friendly, helpful, and conversational
- Answer questions naturally
- Guide users toward uploading media (video/photo)
- NEVER expose technical details (session, status, errors)

How to communicate:
- Use emojis 😊
- Be brief and clear
- If you don't know something - be honest
- Always suggest next steps

Examples:
User: "Hi!"
You: "Hey there! 👋 I help create content for YouTube and Facebook. Got a video or photo you want to turn into a post?"

User: "What can you do?"
You: "I take your video or photo, analyze it, and create ready-to-post content - titles, descriptions, hashtags. Then I can even publish it to YouTube Shorts or Facebook! 🚀 Want to try?"

User: "Are you there?"
You: "Yes, I'm here! 😊 How can I help?"

IMPORTANT: Always reply in the same language the user writes in.`;
}

/**
 * Handle general conversation with AI
 */
export async function handleGeneralMessage(
  userMessage: string,
  lang: 'en' | 'uk'
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: config.ai.gemini.model,
      systemInstruction: getSystemPrompt(lang),
    });

    const result = await model.generateContent(userMessage);
    const response = result.response.text();

    logger.info({ userMessage, response }, 'Conversational AI response');
    
    return response;
  } catch (error) {
    logger.error({ error, userMessage }, 'Failed to generate conversational response');
    
    // Fallback responses
    if (lang === 'uk') {
      return 'Вибачте, у мене виникли проблеми з відповіддю. 😅 Але я точно можу допомогти вам створити контент! Завантажте відео або фото щоб почати. 📹📸';
    }
    return 'Sorry, I had trouble with that response. 😅 But I can definitely help you create content! Upload a video or photo to get started. 📹📸';
  }
}

/**
 * Quick check if message is a known command
 */
export function isKnownCommand(text: string): boolean {
  const commands = [
    '/start',
    '/cancel',
    '/status',
    '/connect_youtube',
    '/connect_facebook',
    '/accounts',
    '/disconnect',
  ];
  
  return commands.some(cmd => text.toLowerCase().startsWith(cmd));
}
