import "dotenv/config";
import express, { Application, Request, Response } from "express";
import { authUrl, redeemCode, getAccessToken } from "./auth";
import shutdown from './utils/shutdown';
import handleError from './utils/error'
import { getServerPort } from './utils/utils'

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
        console.log("Auth success!");
        console.log(`HubId: ${authInfo.hsPortalId}, expires in ${authInfo.expiresIn} seconds`);
        res.send(`Token created successfully for HubId ${authInfo.hsPortalId}, see server/console logs for details`)
      }
    } catch (error: any) {
      handleError(error, 'There was an issue in the Oauth callback ')
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
    tokenDetails.errorMessage = `Invalid customerId: ${req.query?.customerId}`
  } else {
    const getTokenResponse = await getAccessToken(String(customerId));
    if(getTokenResponse){
      tokenDetails.accessToken = getTokenResponse;
    } else {
      tokenDetails.errorMessage = `No token found for customerId: ${customerId}`
    }
  }

  res.send(tokenDetails);
})

console.log(serverPort);
const server = app.listen(serverPort, function () {
  console.log(`App is listening on port ${serverPort} !`);
});

process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  shutdown()
});

export default server
