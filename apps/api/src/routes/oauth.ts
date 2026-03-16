import { FastifyInstance } from 'fastify';
import { database } from '@ai-agent/database';
import { telegramNotification } from '@ai-agent/media';
import { logger } from '@ai-agent/observability';
import { config } from '@ai-agent/config';
import { google } from 'googleapis';
import axios from 'axios';
import crypto from 'crypto';

/**
 * OAuth Routes
 * 
 * Handles OAuth callbacks for YouTube and Facebook
 */

// In-memory state store (for MVP - use Redis in production)
const oauthStates = new Map<string, { telegramId: string; platform: string; expiresAt: Date }>();

// Cleanup expired states every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [state, data] of oauthStates.entries()) {
    if (data.expiresAt < now) {
      oauthStates.delete(state);
    }
  }
}, 5 * 60 * 1000);

export async function oauthRoutes(fastify: FastifyInstance) {
  /**
   * Generate YouTube OAuth URL
   */
  fastify.post('/oauth/youtube/generate', async (request, reply) => {
    const { telegramId } = request.body as { telegramId: string };

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
    const { telegramId } = request.body as { telegramId: string };

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
    const { code, state } = request.query as { code?: string; state?: string };

    logger.info({ state }, 'YouTube OAuth callback received');

    try {
      // Validate state
      if (!state || !oauthStates.has(state)) {
        throw new Error('Invalid or expired state');
      }

      const stateData = oauthStates.get(state)!;
      oauthStates.delete(state); // Use once

      if (!code) {
        throw new Error('No authorization code received');
      }

      // Exchange code for tokens
      const oauth2Client = new google.auth.OAuth2(
        config.youtube.clientId,
        config.youtube.clientSecret,
        config.youtube.redirectUri
      );

      const { tokens } = await oauth2Client.getToken(code);

      logger.info({ telegramId: stateData.telegramId }, 'YouTube tokens received');

      // Get user info
      oauth2Client.setCredentials(tokens);
      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
      const channelResponse = await youtube.channels.list({
        part: ['snippet'],
        mine: true,
      });

      const channel = channelResponse.data.items?.[0];
      if (!channel) {
        throw new Error('No YouTube channel found');
      }

      // Get user from database
      const user = await database.user.findUnique({
        where: { telegramId: stateData.telegramId },
        include: { brandProfile: true },
      });

      if (!user || !user.brandProfile) {
        throw new Error('User or BrandProfile not found');
      }

      // Calculate expiry
      const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

      // Store in ConnectedAccount
      await database.connectedAccount.upsert({
        where: {
          brandProfileId_platform: {
            brandProfileId: user.brandProfile.id,
            platform: 'YOUTUBE',
          },
        },
        update: {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || undefined,
          expiresAt,
          platformUserId: channel.id || undefined,
          platformUserName: channel.snippet?.title || undefined,
        },
        create: {
          brandProfileId: user.brandProfile.id,
          platform: 'YOUTUBE',
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || undefined,
          expiresAt,
          platformUserId: channel.id || undefined,
          platformUserName: channel.snippet?.title || undefined,
        },
      });

      logger.info({ channelId: channel.id, telegramId: stateData.telegramId }, 'YouTube account connected');

      // Send Telegram notification
      await telegramNotification.sendMessage({
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
    } catch (error: any) {
      logger.error({ error }, 'YouTube OAuth callback failed');

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
    const { code, state } = request.query as { code?: string; state?: string };

    logger.info({ state }, 'Facebook OAuth callback received');

    try {
      // Validate state
      if (!state || !oauthStates.has(state)) {
        throw new Error('Invalid or expired state');
      }

      const stateData = oauthStates.get(state)!;
      oauthStates.delete(state);

      if (!code) {
        throw new Error('No authorization code received');
      }

      // Exchange code for access token
      const tokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
        params: {
          client_id: config.facebook.appId,
          client_secret: config.facebook.appSecret,
          redirect_uri: config.facebook.redirectUri,
          code,
        },
      });

      const { access_token, expires_in } = tokenResponse.data;

      logger.info({ telegramId: stateData.telegramId }, 'Facebook token received');

      // Get Page info (assuming user selected a Page during auth)
      const pageResponse = await axios.get('https://graph.facebook.com/v21.0/me', {
        params: {
          access_token,
          fields: 'id,name',
        },
      });

      const page = pageResponse.data;

      // Get user from database
      const user = await database.user.findUnique({
        where: { telegramId: stateData.telegramId },
        include: { brandProfile: true },
      });

      if (!user || !user.brandProfile) {
        throw new Error('User or BrandProfile not found');
      }

      // Calculate expiry
      const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

      // Store in ConnectedAccount
      await database.connectedAccount.upsert({
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

      logger.info({ pageId: page.id, telegramId: stateData.telegramId }, 'Facebook account connected');

      // Send Telegram notification
      await telegramNotification.sendMessage({
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
    } catch (error: any) {
      logger.error({ error }, 'Facebook OAuth callback failed');

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
export function generateOAuthState(telegramId: string, platform: 'YOUTUBE' | 'FACEBOOK'): string {
  const state = crypto.randomBytes(32).toString('hex');
  
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 min expiry

  oauthStates.set(state, {
    telegramId,
    platform,
    expiresAt,
  });

  logger.info({ state, telegramId, platform }, 'OAuth state generated');

  return state;
}

/**
 * Generate YouTube OAuth URL
 */
export function generateYouTubeOAuthUrl(state: string): string {
  const oauth2Client = new google.auth.OAuth2(
    config.youtube.clientId,
    config.youtube.clientSecret,
    config.youtube.redirectUri
  );

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
export function generateFacebookOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.facebook.appId!,
    redirect_uri: config.facebook.redirectUri!,
    state,
    scope: 'pages_manage_posts,pages_read_engagement',
  });

  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}
