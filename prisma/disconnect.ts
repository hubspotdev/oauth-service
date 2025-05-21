import prismaSeed from '../prisma/seed';
import { logger } from '../src/utils/logger';

async function disconnectPrisma(): Promise<void> {
  try {
    logger.info({
      logMessage: {
        message: "Disconnecting from the database"
      },
      context: "Database"
    });
    await prismaSeed.$disconnect();
    logger.info({
      logMessage: {
        message: "Disconnected from the database successfully"
      },
      context: "Database"
    });
  } catch (error) {
    logger.error({
      logMessage: {
        message: "Error while disconnecting from the database",
        error: error as Error
      },
      context: "Database"
    });
    throw error;
  }
}

export default disconnectPrisma
