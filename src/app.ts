import "dotenv/config";
import express, { Application, Request, Response } from "express";
import { authUrl, redeemCode, getAccessToken } from "./auth";
import shutdown from './utils/shutdown';
import handleError from './utils/error'
import { getServerPort } from './utils/utils'
import { logger } from './utils/logger';
import { PrismaClient } from '@prisma/client';

const app: Application = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const serverPort:number = getServerPort();
const clientPort:number = serverPort - 1;
const prisma = new PrismaClient();

type accessTokenResponse = {
  accessToken?: String,
  hubId?: Number,
  expiresAt?: Date,
  errorMessage?: String,
}

app.get("/install", (req: Request, res: Response) => {
  res.send(`<a href="${authUrl}">${authUrl}</a>`);
});

app.get("/oauth-callback", async (req: Request, res: Response):Promise<void> => {
  const code = req.query.code;

  if (!code) {
    logger.warn({
      logMessage: {
        message: "No auth code provided in callback"
      },
      context: "OAuth Callback"
    });
    res.redirect('/?errMessage=No authorization code provided');
    return;
  }

  try {
    const authInfo = await redeemCode(code.toString());
    if (!authInfo) {
      throw new Error('Failed to exchange authorization code');
    }

    logger.info({
      logMessage: {
        message: "Auth success",
        data: {
          hubId: authInfo.hsPortalId,
          expiresIn: authInfo.expiresIn
        }
      },
      context: "OAuth Callback"
    });
    res.send(`Token created successfully for HubId ${authInfo.hsPortalId}, see server/console logs for details`);
  } catch (error: any) {
    logger.error({
      logMessage: {
        message: "OAuth callback error",
        error: error as Error
      },
      context: "OAuth Callback"
    });
    handleError(error, 'There was an issue in the Oauth callback ');
    res.redirect(`/?errMessage=${error.message}`);
  }
});

app.get("/api/get-install-url", (req: Request, res: Response) => {
  res.send(authUrl);
});

app.get("/api/get-token", async (req: Request, res:Response): Promise<void> => {
  let tokenDetails:accessTokenResponse = {};
  const customerId: number = Number(req.query?.customerId);

  if(Number.isNaN(customerId)){
    // If invalid, set error message and send response immediately
    tokenDetails.errorMessage = `Invalid customerId: ${req.query?.customerId}`
    res.send(tokenDetails);
    return;
  }

  try {
    // First check if we have any authorization record for this customer
    const existingAuth = await prisma.authorization.findFirst({
      where: { customerId: String(customerId) }
    });

    if (!existingAuth) {
      tokenDetails.errorMessage = "No OAuth authorization found. Please complete the OAuth flow first.";
      res.status(401).send(tokenDetails);
      return;
    }

    // Attempt to get access token
    const getTokenResponse = await getAccessToken(String(customerId));
    if(getTokenResponse){
      // If token exists, add it to response and send back to client
      tokenDetails.accessToken = getTokenResponse;
      res.send(tokenDetails);
      return;
    }
  } catch (error: any) {
    logger.error({
      logMessage: {
        message: "Error getting token",
        error: error as Error,
        data: { customerId }
      },
      context: "Token Retrieval"
    });

    // Check if it's a refresh token error
    if (error?.message?.includes('BAD_REFRESH_TOKEN')) {
      tokenDetails.errorMessage = "OAuth session expired. Please re-authenticate.";
      res.status(401).send(tokenDetails);
      return;
    }
  }

  // If we get here, something else went wrong
  tokenDetails.errorMessage = "Failed to retrieve access token. Please try re-authenticating.";
  res.status(500).send(tokenDetails);
});

const server = app.listen(serverPort, function () {
  logger.info({
    logMessage: {
      message: `App is listening on port ${serverPort}`,
    },
    context: "Server Startup"
  });
});

process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  shutdown()
});

export default server
