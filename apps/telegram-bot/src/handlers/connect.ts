import { Context } from 'telegraf';
import { database } from '@ai-agent/database';
import { logger } from '@ai-agent/observability';
import axios from 'axios';
import { config } from '@ai-agent/config';

/**
 * OAuth Connect Commands
 * 
 * /connect_youtube - Connect YouTube account
 * /connect_facebook - Connect Facebook account
 * /accounts - List connected accounts
 * /disconnect <platform> - Disconnect account
 */

const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${config.api.port}`;

export async function handleConnectYouTube(ctx: Context) {
  if (!ctx.from) return;

  try {
    logger.info({ userId: ctx.from.id }, 'Initiating YouTube connection');

    // Generate OAuth state via API
    const response = await axios.post(`${API_BASE_URL}/oauth/youtube/generate`, {
      telegramId: ctx.from.id.toString(),
    });

    const { authUrl } = response.data;

    await ctx.reply(
      '🔗 *Connect your YouTube account*\n\n' +
      'Click the link below to authorize:\n\n' +
      `${authUrl}\n\n` +
      '⚠️ Make sure you select the YouTube channel you want to publish to.\n\n' +
      'You will be redirected back here after authorization.',
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error({ error }, 'Failed to generate YouTube OAuth URL');
    await ctx.reply(
      '⚠️ Failed to generate connection link. Please try again later.'
    );
  }
}

export async function handleConnectFacebook(ctx: Context) {
  if (!ctx.from) return;

  try {
    logger.info({ userId: ctx.from.id }, 'Initiating Facebook connection');

    // Generate OAuth state via API
    const response = await axios.post(`${API_BASE_URL}/oauth/facebook/generate`, {
      telegramId: ctx.from.id.toString(),
    });

    const { authUrl } = response.data;

    await ctx.reply(
      '🔗 *Connect your Facebook account*\n\n' +
      'Click the link below to authorize:\n\n' +
      `${authUrl}\n\n` +
      '⚠️ Make sure you select the Facebook Page you want to publish to.\n\n' +
      'You will be redirected back here after authorization.',
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error({ error }, 'Failed to generate Facebook OAuth URL');
    await ctx.reply(
      '⚠️ Failed to generate connection link. Please try again later.'
    );
  }
}

export async function handleAccounts(ctx: Context) {
  if (!ctx.from) return;

  try {
    const user = await database.user.findUnique({
      where: { telegramId: ctx.from.id.toString() },
      include: {
        brandProfile: {
          include: {
            connectedAccounts: true,
          },
        },
      },
    });

    if (!user || !user.brandProfile) {
      await ctx.reply('No accounts found. Use /start first.');
      return;
    }

    const accounts = user.brandProfile.connectedAccounts;

    if (accounts.length === 0) {
      await ctx.reply(
        '📱 *No connected accounts*\n\n' +
        'Connect your accounts:\n' +
        '/connect\\_youtube - Connect YouTube\n' +
        '/connect\\_facebook - Connect Facebook',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    let message = '📱 *Connected Accounts*\n\n';

    for (const account of accounts) {
      const expiryText = account.expiresAt
        ? `Expires: ${account.expiresAt.toLocaleDateString()}`
        : 'No expiry';
      
      message += `✅ *${account.platform}*\n`;
      message += `   ${account.platformUserName || account.platformUserId || 'Unknown'}\n`;
      message += `   ${expiryText}\n\n`;
    }

    message += '\nTo disconnect: /disconnect <platform>';

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error({ error }, 'Failed to list accounts');
    await ctx.reply('⚠️ Failed to load accounts.');
  }
}

export async function handleDisconnect(ctx: Context) {
  if (!ctx.from || !ctx.message || !('text' in ctx.message)) return;

  const parts = ctx.message.text.split(' ');
  const platform = parts[1]?.toUpperCase();

  if (!platform || !['YOUTUBE', 'FACEBOOK'].includes(platform)) {
    await ctx.reply(
      'Usage: /disconnect <platform>\n\n' +
      'Example: /disconnect youtube'
    );
    return;
  }

  try {
    const user = await database.user.findUnique({
      where: { telegramId: ctx.from.id.toString() },
      include: { brandProfile: true },
    });

    if (!user || !user.brandProfile) {
      await ctx.reply('No accounts found.');
      return;
    }

    const deleted = await database.connectedAccount.deleteMany({
      where: {
        brandProfileId: user.brandProfile.id,
        platform: platform as 'YOUTUBE' | 'FACEBOOK',
      },
    });

    if (deleted.count === 0) {
      await ctx.reply(`No ${platform} account connected.`);
    } else {
      await ctx.reply(`✅ ${platform} account disconnected.`);
      logger.info({ userId: ctx.from.id, platform }, 'Account disconnected');
    }
  } catch (error) {
    logger.error({ error }, 'Failed to disconnect account');
    await ctx.reply('⚠️ Failed to disconnect account.');
  }
}
