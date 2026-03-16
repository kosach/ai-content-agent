import { IPublisher, PublishRequest, PublishResult, TokenRefreshResult, PlatformConstraints } from '../interfaces/publisher.interface';
/**
 * YouTube Publisher
 *
 * Publishes videos to YouTube as Shorts
 * Uses YouTube Data API v3
 */
export declare class YouTubePublisher implements IPublisher {
    private clientId;
    private clientSecret;
    private redirectUri;
    private oauth2Client;
    constructor(clientId: string, clientSecret: string, redirectUri: string);
    publish(request: PublishRequest, accessToken: string): Promise<PublishResult>;
    validateCredentials(accessToken: string): Promise<boolean>;
    refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult>;
    getConstraints(): PlatformConstraints;
    getName(): string;
    /**
     * Prepare video snippet (metadata)
     */
    private prepareSnippet;
    /**
     * Validate video before upload
     */
    private validateVideo;
    /**
     * Handle API errors and categorize them
     */
    private handleError;
    /**
     * Get tomorrow's date (for quota reset)
     */
    private getTomorrowDate;
    /**
     * Get retry-after date
     */
    private getRetryAfterDate;
}
//# sourceMappingURL=youtube-publisher.d.ts.map