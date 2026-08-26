import { connectDB, disconnectDB } from '@/config/database';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { serve } from '@hono/node-server';
import app from './app';

const startServer = async () => {
  await connectDB();

  const port = parseInt(env.PORT, 10);

  const server = serve({
    fetch: app.fetch,
    port,
  }, (info) => {
    logger.info(`Server is running on http://localhost:${info.port}`);
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    
    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDB();
      logger.info('Database connection closed.');
      process.exit(0);
    });

    // Force close if it takes too long
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
