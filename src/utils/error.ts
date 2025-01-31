import { logger } from './logger';
import shutdown from './shutdown'
import { LogObject } from 'default';

function isHubSpotApiError(error: any) {
  return Boolean(error?.message?.includes('hubapi'));
}
function isGeneralPrismaError(error: any): boolean {
  return error?.stack?.includes('@prisma/client') || error?.message?.includes('prisma');
}

function formatError(logMessage: any, context: string = ''): any {
  const error: LogObject = {logMessage, context}
  if (context) error.context = context;
  if (isGeneralPrismaError(error)) {
    error.type = 'Prisma';
  } else if (isHubSpotApiError(error)) {
    error.type = 'Hubspot API';
  } else if (logMessage instanceof Error) {
    error.type = 'General';
  } else {
    error.type = 'Non-error object was thrown';
  }
  return error;
}

function handleError(error: any, context: string = '', critical: boolean = false): void {
  const formattedError = formatError(error, context);
  logger.error(formattedError);

  if (critical) shutdown();
}

export default handleError
