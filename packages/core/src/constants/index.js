"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATFORM_LIMITS = exports.SESSION_LIMITS = exports.JOB_TIMEOUT = exports.MAX_RETRIES = exports.QUEUE_NAMES = void 0;
exports.QUEUE_NAMES = {
    MEDIA_ANALYSIS: 'media-analysis',
    DRAFT_GENERATION: 'draft-generation',
    YOUTUBE_PUBLISHING: 'youtube-publishing',
    FACEBOOK_PUBLISHING: 'facebook-publishing',
};
exports.MAX_RETRIES = {
    MEDIA_ANALYSIS: 3,
    DRAFT_GENERATION: 3,
    YOUTUBE_PUBLISHING: 5,
    FACEBOOK_PUBLISHING: 5,
};
exports.JOB_TIMEOUT = {
    MEDIA_ANALYSIS: 10 * 60 * 1000, // 10 minutes (video analysis can be slow)
    DRAFT_GENERATION: 5 * 60 * 1000, // 5 minutes
    YOUTUBE_PUBLISHING: 10 * 60 * 1000, // 10 minutes (upload can be slow)
    FACEBOOK_PUBLISHING: 5 * 60 * 1000, // 5 minutes
};
exports.SESSION_LIMITS = {
    MAX_MEDIA_ASSETS: 10,
    MAX_SESSION_DURATION_HOURS: 24,
    MAX_MESSAGE_LENGTH: 4096, // Telegram limit
    MAX_FILE_SIZE_MB: 50,
};
exports.PLATFORM_LIMITS = {
    YOUTUBE: {
        MAX_TITLE_LENGTH: 100,
        MAX_DESCRIPTION_LENGTH: 5000,
        MAX_HASHTAGS: 15,
        MAX_VIDEO_DURATION_SECONDS: 60, // Shorts limit
    },
    FACEBOOK: {
        MAX_TEXT_LENGTH: 63206,
        MAX_HASHTAGS: 30,
        MAX_IMAGES: 10,
    },
};
//# sourceMappingURL=index.js.map