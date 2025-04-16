import "dotenv/config";
import express, { Application, Request, Response } from "express";
import { authUrl, redeemCode, getAccessToken } from "./auth";
import shutdown from './utils/shutdown';
import handleError from './utils/error'
import { getServerPort } from './utils/utils'
import { logger } from './utils/logger';

const app: Application = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const serverPort:number = getServerPort();
const clientPort:number = serverPort - 1;

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

  if (code) {
    try {
      const authInfo = await redeemCode(code.toString());
      if(authInfo){
        logger.info({
          logMessage: {
            message: "OAuth authentication successful",
            data: {
              hubId: authInfo.hsPortalId,
              expiresIn: authInfo.expiresIn
            }
          },
          context: "OAuth Callback"
        });
        res.send(`Token created successfully for HubId ${authInfo.hsPortalId}, see server/console logs for details`)
      }
    } catch (error: any) {
      handleError(error, 'OAuth callback error')
      res.redirect(`/?errMessage=${error.message}`);
    }
  }
})

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
    // Attempt to get access token
    const getTokenResponse = await getAccessToken(String(customerId));
    if(getTokenResponse){
      // If token exists, add it to response and send back to client
      tokenDetails.accessToken = getTokenResponse;
      res.send(tokenDetails);
      return;
    }
  } catch (error) {
    logger.error({
      logMessage: {
        message: "Error getting token",
        error: error as Error,
        data: { customerId }
      },
      context: "Token Retrieval"
    });
  }

  // Token acquisition failed due to one of the following conditions:
  // 1. No valid token exists in the database
  // 2. Token refresh attempt was unsuccessful
  // Redirecting to OAuth installation flow for re-authentication
  res.redirect('/install');
})

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
