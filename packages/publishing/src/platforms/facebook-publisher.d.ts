import { IPublisher, PublishRequest, PublishResult, TokenRefreshResult, PlatformConstraints } from '../interfaces/publisher.interface';
/**
 * Facebook Publisher
 *
 * Publishes videos to Facebook Pages
 * Uses Facebook Graph API
 */
export declare class FacebookPublisher implements IPublisher {
    private appId;
    private appSecret;
    private redirectUri;
    private readonly graphApiUrl;
    constructor(appId: string, appSecret: string, redirectUri: string);
    publish(request: PublishRequest, accessToken: string): Promise<PublishResult>;
    validateCredentials(accessToken: string): Promise<boolean>;
    refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult>;
    getConstraints(): PlatformConstraints;
    getName(): string;
    /**
     * Get Page ID from access token
     *
     * Note: For MVP, we assume the access token is for a specific Page.
     * In production, you might need to let user select which Page to publish to.
     */
    private getPageId;
    /**
     * Upload video to Facebook Page
     */
    private uploadVideo;
    /**
     * Validate video before upload
     */
    private validateVideo;
    /**
     * Handle API errors and categorize them
     */
    private handleError;
    /**
     * Get retry-after date
     */
    private getRetryAfterDate;
}
//# sourceMappingURL=facebook-publisher.d.ts.map