"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.oauthRoutes = oauthRoutes;
exports.generateOAuthState = generateOAuthState;
exports.generateYouTubeOAuthUrl = generateYouTubeOAuthUrl;
exports.generateFacebookOAuthUrl = generateFacebookOAuthUrl;
const database_1 = require("@ai-agent/database");
const media_1 = require("@ai-agent/media");
const observability_1 = require("@ai-agent/observability");
const config_1 = require("@ai-agent/config");
const googleapis_1 = require("googleapis");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * OAuth Routes
 *
 * Handles OAuth callbacks for YouTube and Facebook
 */
// In-memory state store (for MVP - use Redis in production)
const oauthStates = new Map();
// Cleanup expired states every 5 minutes
setInterval(() => {
    const now = new Date();
    for (const [state, data] of oauthStates.entries()) {
        if (data.expiresAt < now) {
            oauthStates.delete(state);
        }
    }
}, 5 * 60 * 1000);
async function oauthRoutes(fastify) {
    /**
     * Generate YouTube OAuth URL
     */
    fastify.post('/oauth/youtube/generate', async (request, reply) => {
        const { telegramId } = request.body;
        if (!telegramId) {
            return reply.code(400).send({ error: 'telegramId is required' });
        }
        const state = generateOAuthState(telegramId, 'YOUTUBE');
        const authUrl = generateYouTubeOAuthUrl(state);
        return { authUrl, state };
    });
    /**
     * Generate Facebook OAuth URL
     */
    fastify.post('/oauth/facebook/generate', async (request, reply) => {
        const { telegramId } = request.body;
        if (!telegramId) {
            return reply.code(400).send({ error: 'telegramId is required' });
        }
        const state = generateOAuthState(telegramId, 'FACEBOOK');
        const authUrl = generateFacebookOAuthUrl(state);
        return { authUrl, state };
    });
    /**
     * YouTube OAuth Callback
     */
    fastify.get('/oauth/youtube/callback', async (request, reply) => {
        const { code, state } = request.query;
        observability_1.logger.info({ state }, 'YouTube OAuth callback received');
        try {
            // Validate state
            if (!state || !oauthStates.has(state)) {
                throw new Error('Invalid or expired state');
            }
            const stateData = oauthStates.get(state);
            oauthStates.delete(state); // Use once
            if (!code) {
                throw new Error('No authorization code received');
            }
            // Exchange code for tokens
            const oauth2Client = new googleapis_1.google.auth.OAuth2(config_1.config.youtube.clientId, config_1.config.youtube.clientSecret, config_1.config.youtube.redirectUri);
            const { tokens } = await oauth2Client.getToken(code);
            observability_1.logger.info({ telegramId: stateData.telegramId }, 'YouTube tokens received');
            // Get user info
            oauth2Client.setCredentials(tokens);
            const youtube = googleapis_1.google.youtube({ version: 'v3', auth: oauth2Client });
            const channelResponse = await youtube.channels.list({
                part: ['snippet'],
                mine: true,
            });
            const channel = channelResponse.data.items?.[0];
            if (!channel) {
                throw new Error('No YouTube channel found');
            }
            // Get user from database
            const user = await database_1.database.user.findUnique({
                where: { telegramId: stateData.telegramId },
                include: { brandProfile: true },
            });
            if (!user || !user.brandProfile) {
                throw new Error('User or BrandProfile not found');
            }
            // Calculate expiry
            const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
            // Store in ConnectedAccount
            await database_1.database.connectedAccount.upsert({
                where: {
                    brandProfileId_platform: {
                        brandProfileId: user.brandProfile.id,
                        platform: 'YOUTUBE',
                    },
                },
                update: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token || undefined,
                    expiresAt,
                    platformUserId: channel.id || undefined,
                    platformUserName: channel.snippet?.title || undefined,
                },
                create: {
                    brandProfileId: user.brandProfile.id,
                    platform: 'YOUTUBE',
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token || undefined,
                    expiresAt,
                    platformUserId: channel.id || undefined,
                    platformUserName: channel.snippet?.title || undefined,
                },
            });
            observability_1.logger.info({ channelId: channel.id, telegramId: stateData.telegramId }, 'YouTube account connected');
            // Send Telegram notification
            await media_1.telegramNotification.sendMessage({
                chatId: stateData.telegramId,
                text: `✅ YouTube account connected successfully!\n\nChannel: ${channel.snippet?.title}`,
            });
            // Return success page
            return reply.type('text/html').send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>YouTube Connected</title>
            <style>
              body { font-family: sans-serif; text-align: center; padding: 50px; }
              h1 { color: #4CAF50; }
            </style>
          </head>
          <body>
            <h1>✅ YouTube Connected!</h1>
            <p>Channel: <strong>${channel.snippet?.title}</strong></p>
            <p>You can close this window and return to Telegram.</p>
          </body>
        </html>
      `);
        }
        catch (error) {
            observability_1.logger.error({ error }, 'YouTube OAuth callback failed');
            return reply.type('text/html').send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Connection Failed</title>
            <style>
              body { font-family: sans-serif; text-align: center; padding: 50px; }
              h1 { color: #f44336; }
            </style>
          </head>
          <body>
            <h1>❌ Connection Failed</h1>
            <p>${error.message}</p>
            <p>Please try again in Telegram.</p>
          </body>
        </html>
      `);
        }
    });
    /**
     * Facebook OAuth Callback
     */
    fastify.get('/oauth/facebook/callback', async (request, reply) => {
        const { code, state } = request.query;
        observability_1.logger.info({ state }, 'Facebook OAuth callback received');
        try {
            // Validate state
            if (!state || !oauthStates.has(state)) {
                throw new Error('Invalid or expired state');
            }
            const stateData = oauthStates.get(state);
            oauthStates.delete(state);
            if (!code) {
                throw new Error('No authorization code received');
            }
            // Exchange code for access token
            const tokenResponse = await axios_1.default.get('https://graph.facebook.com/v21.0/oauth/access_token', {
                params: {
                    client_id: config_1.config.facebook.appId,
                    client_secret: config_1.config.facebook.appSecret,
                    redirect_uri: config_1.config.facebook.redirectUri,
                    code,
                },
            });
            const { access_token, expires_in } = tokenResponse.data;
            observability_1.logger.info({ telegramId: stateData.telegramId }, 'Facebook token received');
            // Get Page info (assuming user selected a Page during auth)
            const pageResponse = await axios_1.default.get('https://graph.facebook.com/v21.0/me', {
                params: {
                    access_token,
                    fields: 'id,name',
                },
            });
            const page = pageResponse.data;
            // Get user from database
            const user = await database_1.database.user.findUnique({
                where: { telegramId: stateData.telegramId },
                include: { brandProfile: true },
            });
            if (!user || !user.brandProfile) {
                throw new Error('User or BrandProfile not found');
            }
            // Calculate expiry
            const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;
            // Store in ConnectedAccount
            await database_1.database.connectedAccount.upsert({
                where: {
                    brandProfileId_platform: {
                        brandProfileId: user.brandProfile.id,
                        platform: 'FACEBOOK',
                    },
                },
                update: {
                    accessToken: access_token,
                    expiresAt,
                    platformUserId: page.id,
                    platformUserName: page.name,
                },
                create: {
                    brandProfileId: user.brandProfile.id,
                    platform: 'FACEBOOK',
                    accessToken: access_token,
                    expiresAt,
                    platformUserId: page.id,
                    platformUserName: page.name,
                },
            });
            observability_1.logger.info({ pageId: page.id, telegramId: stateData.telegramId }, 'Facebook account connected');
            // Send Telegram notification
            await media_1.telegramNotification.sendMessage({
                chatId: stateData.telegramId,
                text: `✅ Facebook account connected successfully!\n\nPage: ${page.name}`,
            });
            // Return success page
            return reply.type('text/html').send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Facebook Connected</title>
            <style>
              body { font-family: sans-serif; text-align: center; padding: 50px; }
              h1 { color: #4CAF50; }
            </style>
          </head>
          <body>
            <h1>✅ Facebook Connected!</h1>
            <p>Page: <strong>${page.name}</strong></p>
            <p>You can close this window and return to Telegram.</p>
          </body>
        </html>
      `);
        }
        catch (error) {
            observability_1.logger.error({ error }, 'Facebook OAuth callback failed');
            return reply.type('text/html').send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Connection Failed</title>
            <style>
              body { font-family: sans-serif; text-align: center; padding: 50px; }
              h1 { color: #f44336; }
            </style>
          </head>
          <body>
            <h1>❌ Connection Failed</h1>
            <p>${error.message}</p>
            <p>Please try again in Telegram.</p>
          </body>
        </html>
      `);
        }
    });
}
/**
 * Generate OAuth state and store it
 */
function generateOAuthState(telegramId, platform) {
    const state = crypto_1.default.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 min expiry
    oauthStates.set(state, {
        telegramId,
        platform,
        expiresAt,
    });
    observability_1.logger.info({ state, telegramId, platform }, 'OAuth state generated');
    return state;
}
/**
 * Generate YouTube OAuth URL
 */
function generateYouTubeOAuthUrl(state) {
    const oauth2Client = new googleapis_1.google.auth.OAuth2(config_1.config.youtube.clientId, config_1.config.youtube.clientSecret, config_1.config.youtube.redirectUri);
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtube',
        ],
        state,
    });
    return url;
}
/**
 * Generate Facebook OAuth URL
 */
function generateFacebookOAuthUrl(state) {
    const params = new URLSearchParams({
        client_id: config_1.config.facebook.appId,
        redirect_uri: config_1.config.facebook.redirectUri,
        state,
        scope: 'pages_manage_posts,pages_read_engagement',
    });
    return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}
//# sourceMappingURL=oauth.js.map