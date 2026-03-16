export declare const QUEUE_NAMES: {
    readonly MEDIA_ANALYSIS: "media-analysis";
    readonly DRAFT_GENERATION: "draft-generation";
    readonly YOUTUBE_PUBLISHING: "youtube-publishing";
    readonly FACEBOOK_PUBLISHING: "facebook-publishing";
};
export declare const MAX_RETRIES: {
    readonly MEDIA_ANALYSIS: 3;
    readonly DRAFT_GENERATION: 3;
    readonly YOUTUBE_PUBLISHING: 5;
    readonly FACEBOOK_PUBLISHING: 5;
};
export declare const JOB_TIMEOUT: {
    readonly MEDIA_ANALYSIS: number;
    readonly DRAFT_GENERATION: number;
    readonly YOUTUBE_PUBLISHING: number;
    readonly FACEBOOK_PUBLISHING: number;
};
export declare const SESSION_LIMITS: {
    readonly MAX_MEDIA_ASSETS: 10;
    readonly MAX_SESSION_DURATION_HOURS: 24;
    readonly MAX_MESSAGE_LENGTH: 4096;
    readonly MAX_FILE_SIZE_MB: 50;
};
export declare const PLATFORM_LIMITS: {
    readonly YOUTUBE: {
        readonly MAX_TITLE_LENGTH: 100;
        readonly MAX_DESCRIPTION_LENGTH: 5000;
        readonly MAX_HASHTAGS: 15;
        readonly MAX_VIDEO_DURATION_SECONDS: 60;
    };
    readonly FACEBOOK: {
        readonly MAX_TEXT_LENGTH: 63206;
        readonly MAX_HASHTAGS: 30;
        readonly MAX_IMAGES: 10;
    };
};
//# sourceMappingURL=index.d.ts.map