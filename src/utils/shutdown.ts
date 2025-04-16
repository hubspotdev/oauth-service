import disconnectPrisma from '../../prisma/disconnect';
import server from '../app';
import { logger } from './logger';

async function shutdown(): Promise<void> {
  try {
    logger.info({
      logMessage: {
        message: "Initiating graceful shutdown"
      },
      context: "Shutdown"
    });

    const closeServerPromise = new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          logger.error({
            logMessage: {
              message: "Error closing the server",
              error: err
            },
            context: "Server Shutdown"
          });
          reject(err);
        } else {
          logger.info({
            logMessage: {
              message: "Server closed successfully"
            },
            context: "Server Shutdown"
          });
          resolve();
        }
      });

      setTimeout(() => {
        logger.warn({
          logMessage: {
            message: "Forcing server shutdown after timeout"
          },
          context: "Server Shutdown"
        });
        resolve();
      }, 5000);
    });

    await Promise.all([
      closeServerPromise,
      disconnectPrisma()
    ]);

    logger.info({
      logMessage: {
        message: "Graceful shutdown complete"
      },
      context: "Shutdown"
    });
    process.exit(0);
  } catch (err) {
    logger.error({
      logMessage: {
        message: "Error during shutdown",
        error: err as Error
      },
      context: "Shutdown",
      critical: true
    });
    process.exit(1);
  }
}

export default shutdown
