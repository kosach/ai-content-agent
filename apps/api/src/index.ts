import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { config } from '@ai-agent/config';
import { logger } from '@ai-agent/observability';
import { oauthRoutes } from './routes/oauth';

async function main() {
  logger.info('Starting API server...');

  const fastify = Fastify({
    logger: false, // Use our own logger
  });

  // Security plugins
  await fastify.register(helmet);
  await fastify.register(cors, {
    origin: true, // Allow all origins for OAuth callbacks
  });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // OAuth routes
  await fastify.register(oauthRoutes);

  // Start server
  try {
    await fastify.listen({
      port: config.api.port,
      host: config.api.host,
    });

    logger.info(
      { port: config.api.port, host: config.api.host },
      'API server started successfully'
    );
  } catch (error) {
    logger.fatal({ error }, 'Failed to start API server');
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down...');
    await fastify.close();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.fatal({ error }, 'Failed to start API server');
  process.exit(1);
});
