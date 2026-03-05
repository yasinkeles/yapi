/**
 * Server Entry Point
 * Starts the HTTP server
 */

const app = require('./app');
const config = require('./config/environment');
const db = require('./config/database');
const logger = require('./utils/logger');
const connectionPoolService = require('./services/connectionPool.service');
const jwtService = require('./services/jwt.service');

let server;

// Initialize database and start server
// Trigger restart for env update
(async () => {
  try {
    await db.initialize();
    logger.info('Database initialized successfully');

    // Start server
    server = app.listen(config.port, config.host, () => {
      logger.info(`🚀 Server started successfully!`, {
        environment: config.nodeEnv,
        host: config.host,
        port: config.port,
        url: `http://${config.host}:${config.port}`
      });

      logger.info('Available endpoints:');
      logger.info(`  - Health Check: http://${config.host}:${config.port}/health`);
      logger.info(`  - Admin API: http://${config.host}:${config.port}/admin/*`);
      logger.info(`  - Dynamic API: http://${config.host}:${config.port}/api/v1/*`);
    });
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Close server
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close all database connection pools
      await connectionPoolService.closeAllPools();
      logger.info('All database pools closed');

      // Cleanup expired tokens
      await jwtService.cleanupExpiredTokens();
      logger.info('Expired tokens cleaned up');

      // Close SQLite database
      db.close();
      logger.info('SQLite database closed');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forceful shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Periodic cleanup tasks
setInterval(async () => {
  try {
    // Cleanup expired tokens every hour
    await jwtService.cleanupExpiredTokens();

    // Cleanup idle connection pools (idle > 1 hour)
    await connectionPoolService.cleanupIdlePools(3600000);
  } catch (error) {
    logger.error('Periodic cleanup task failed:', error);
  }
}, 3600000); // Every hour

module.exports = server;
