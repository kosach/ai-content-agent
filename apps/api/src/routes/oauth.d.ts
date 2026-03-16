import { FastifyInstance } from 'fastify';
export declare function oauthRoutes(fastify: FastifyInstance): Promise<void>;
/**
 * Generate OAuth state and store it
 */
export declare function generateOAuthState(telegramId: string, platform: 'YOUTUBE' | 'FACEBOOK'): string;
/**
 * Generate YouTube OAuth URL
 */
export declare function generateYouTubeOAuthUrl(state: string): string;
/**
 * Generate Facebook OAuth URL
 */
export declare function generateFacebookOAuthUrl(state: string): string;
//# sourceMappingURL=oauth.d.ts.map