/**
 * i18n - Internationalization for Telegram Bot
 * 
 * Detects user language from Telegram and returns localized strings
 */

export const translations = {
  en: {
    // Welcome & Commands
    'welcome.title': '👋 Hey there!',
    'welcome.description': 'I help you create awesome YouTube Shorts and Facebook posts from your videos and photos. Just upload something and I\'ll handle the rest! ✨',
    'welcome.cta': '📹 Upload a video or 📸 photo to get started!',
    'welcome.commands': 'Quick commands:',
    'command.cancel': '/cancel - Start over',
    'command.status': '/status - What\'s happening',
    
    // Session
    'session.cancelled': '✅ Okay, let\'s start fresh! Upload a video or photo when you\'re ready. 😊',
    'session.status': '📊 Current Status',
    'session.mediaUploaded': '📹 Media Uploaded',
    'session.awaitingIntent': '🎯 Awaiting your intent',
    'session.awaitingTone': '🎨 Awaiting tone selection',
    'session.analyzing': '🔍 Analyzing media...',
    'session.generating': '✨ Generating drafts...',
    'session.reviewing': '👀 Review your drafts',
    'session.approved': '✅ Approved, ready to publish',
    'session.publishing': '🚀 Publishing...',
    'session.published': '🎉 Published successfully!',
    
    // Media Upload
    'media.received': 'Got it! Analyzing your {type}...',
    'media.analyzing': '🔍 Analyzing...\n\nThis may take a moment.',
    
    // Questions
    'question.intent': '🎯 What do you want to achieve with this content?\n\nFor example: educate, entertain, sell a product, inspire, etc.',
    'question.tone': '🎨 What tone should the content have?\n\nFor example: professional, casual, funny, inspiring, educational, etc.',
    
    // Drafts
    'drafts.ready': '✅ Content drafts are ready!\n\nReview and approve or request edits.',
    'drafts.youtube': '🎬 YouTube Short',
    'drafts.facebook': '📘 Facebook Post',
    'drafts.approve': '✅ Approve & Publish',
    'drafts.regenerate': '🔄 Regenerate',
    'drafts.edit': '✏️ Edit',
    
    // Publishing
    'publish.success': '🎉 Successfully published to {platform}!',
    'publish.failed': '❌ Failed to publish to {platform}: {error}',
    'publish.noAccounts': '⚠️ No connected accounts. Use /connect_youtube or /connect_facebook first.',
    
    // Errors
    'error.generic': 'Sorry, something went wrong. Please try again.',
    'error.noMedia': 'Please upload a photo or video first.',
  },
  
  uk: {
    // Welcome & Commands
    'welcome.title': '👋 Привіт!',
    'welcome.description': 'Я допомагаю створювати класні YouTube Shorts та пости для Facebook з твоїх відео та фото. Просто завантаж щось і я зроблю решту! ✨',
    'welcome.cta': '📹 Завантаж відео або 📸 фото щоб почати!',
    'welcome.commands': 'Швидкі команди:',
    'command.cancel': '/cancel - Почати спочатку',
    'command.status': '/status - Що відбувається',
    
    // Session
    'session.cancelled': '✅ Гаразд, почнемо спочатку! Завантаж відео або фото коли будеш готовий. 😊',
    'session.status': '📊 Поточний Статус',
    'session.mediaUploaded': '📹 Медіа Завантажено',
    'session.awaitingIntent': '🎯 Очікую вашу мету',
    'session.awaitingTone': '🎨 Очікую вибір тону',
    'session.analyzing': '🔍 Аналізую медіа...',
    'session.generating': '✨ Генерую чернетки...',
    'session.reviewing': '👀 Перегляньте чернетки',
    'session.approved': '✅ Схвалено, готово до публікації',
    'session.publishing': '🚀 Публікую...',
    'session.published': '🎉 Успішно опубліковано!',
    
    // Media Upload
    'media.received': 'Зрозумів! Аналізую ваше {type}...',
    'media.analyzing': '🔍 Аналізую...\n\nЦе може зайняти трохи часу.',
    
    // Questions
    'question.intent': '🎯 Чого ви хочете досягти цим контентом?\n\nНаприклад: навчити, розважити, продати продукт, надихнути тощо.',
    'question.tone': '🎨 Який тон повинен мати контент?\n\nНаприклад: професійний, невимушений, веселий, надихаючий, освітній тощо.',
    
    // Drafts
    'drafts.ready': '✅ Чернетки контенту готові!\n\nПерегляньте та схваліть або попросіть редагувати.',
    'drafts.youtube': '🎬 YouTube Short',
    'drafts.facebook': '📘 Пост Facebook',
    'drafts.approve': '✅ Схвалити та Опублікувати',
    'drafts.regenerate': '🔄 Перегенерувати',
    'drafts.edit': '✏️ Редагувати',
    
    // Publishing
    'publish.success': '🎉 Успішно опубліковано на {platform}!',
    'publish.failed': '❌ Не вдалося опублікувати на {platform}: {error}',
    'publish.noAccounts': '⚠️ Немає підключених акаунтів. Спочатку використайте /connect_youtube або /connect_facebook.',
    
    // Errors
    'error.generic': 'Вибачте, щось пішло не так. Спробуйте ще раз.',
    'error.noMedia': 'Будь ласка, спочатку завантажте фото або відео.',
  },
};

export type Language = 'en' | 'uk';
export type TranslationKey = keyof typeof translations.en;

/**
 * Get user language from Telegram context
 */
export function getUserLanguage(ctx: any): Language {
  // Try to get from Telegram language_code
  const langCode = ctx.from?.language_code;
  
  // Ukrainian variants
  if (langCode === 'uk' || langCode === 'ua' || langCode === 'uk-UA') {
    return 'uk';
  }
  
  // Default to English
  return 'en';
}

/**
 * Translate a key to user's language
 */
export function t(key: TranslationKey, lang: Language, replacements?: Record<string, string>): string {
  let text = translations[lang][key] || translations.en[key] || key;
  
  // Apply replacements if any
  if (replacements) {
    Object.entries(replacements).forEach(([placeholder, value]) => {
      text = text.replace(`{${placeholder}}`, value);
    });
  }
  
  return text;
}

/**
 * Get translated text for current context
 */
export function tc(ctx: any, key: TranslationKey, replacements?: Record<string, string>): string {
  const lang = getUserLanguage(ctx);
  return t(key, lang, replacements);
}
