import "dotenv/config";
import * as hubspot from "@hubspot/api-client";
import { Authorization } from "@prisma/client";
import handleError from './utils/error';
import prisma from '../prisma/seed'
import { getCustomerId, getServerPort } from './utils/utils';

interface ExchangeProof {
  grant_type: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  code?: string;
  refresh_token?: string;
}

type HubspotAccountInfo = {
  portalId: number;
  // accountType: string;
  // timeZone: string;
  // companyCurrency: string;
  // additionalCurrencies: any[];
  // utcOffset: string;
  // utcOffsetMilliseconds: number;
  // uiDomain: string;
  // dataHostingLocation: string;
};

const CLIENT_ID: string = process.env.CLIENT_ID || "CLIENT_ID required";
const CLIENT_SECRET: string =
  process.env.CLIENT_SECRET || "CLIENT_SECRET required";

const REDIRECT_URI: string = `http://localhost:${getServerPort()}/oauth-callback`;
console.log('SCOPES.env ', process.env.SCOPES)
const SCOPES = process.env.SCOPES?.split(',') || 'SCOPES required'
const scopeString = SCOPES?.toString().replaceAll(",", " ");

console.log('SCOPES ', SCOPES)


const EXCHANGE_CONSTANTS = {
  redirect_uri: REDIRECT_URI,
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
};

const hubspotClient = new hubspot.Client();

console.log('SCOPES to string', scopeString)

const authUrl = hubspotClient.oauth.getAuthorizationUrl(
  CLIENT_ID,
  REDIRECT_URI,
  scopeString
);

const getExpiresAt = (expiresIn: number): Date => {
  const now = new Date();

  return new Date(now.getTime() + expiresIn * 1000);
};

const redeemCode = async (code: string): Promise<Authorization | void> => {
  try{
    return await exchangeForTokens({
      ...EXCHANGE_CONSTANTS,
      code,
      grant_type: "authorization_code",
    });
  } catch(error){
    handleError(error, 'There was an issue while exchanging Oauth tokens ')
  }
};

const getHubSpotId = async (accessToken: string): Promise<string | void> => {
  try {
    hubspotClient.setAccessToken(accessToken);
    const hubspotAccountInfoResponse = await hubspotClient.apiRequest({
      path: "/account-info/v3/details",
      method: "GET",
    });

    const hubspotAccountInfo: HubspotAccountInfo = await hubspotAccountInfoResponse.json();
    const hubSpotportalId = hubspotAccountInfo.portalId;
    return hubSpotportalId.toString();
  } catch(error) {
    handleError(error)
  }
};

const exchangeForTokens = async (
  exchangeProof: ExchangeProof
): Promise<Authorization | void> => {
  const {
    code,
    redirect_uri,
    client_id,
    client_secret,
    grant_type,
    refresh_token,
  } = exchangeProof;

  try{
    const tokenResponse = await hubspotClient.oauth.tokensApi.createToken(
      grant_type,
      code,
      redirect_uri,
      client_id,
      client_secret,
      refresh_token
    );

    const {
      accessToken,
      refreshToken,
      expiresIn
    } = tokenResponse;
    const expiresAt: Date = getExpiresAt(expiresIn);
    const customerId: string = getCustomerId();
    const hsPortalId: string | void = await getHubSpotId(accessToken);

  if(typeof hsPortalId !== 'string'){
    throw new Error('The Hubspot Portal ID was not a string, there maybe an issue with the Hubspot client or access tokens');
  }
      const tokenInfo = await prisma.authorization.upsert({
        where: {
          customerId: customerId,
        },
        update: {
          refreshToken,
          accessToken,
          expiresIn,
          expiresAt,
          hsPortalId,
        },
        create: {
          refreshToken,
          accessToken,
          expiresIn,
          expiresAt,
          hsPortalId,
          customerId,
        },
      });

      return tokenInfo;
  } catch(error){
    handleError(error, 'There was an issue upserting the user\'s auth token info to Prisma ', true)
  }
};

const getAccessToken = async (customerId: string): Promise<string | void> => {
  try {
    const currentCreds = (await prisma.authorization.findFirst({
      select: {
        accessToken: true,
        expiresAt: true,
        refreshToken: true,
      },
      where: {
        customerId,
      },
    })) as Authorization;
    if (currentCreds?.expiresAt && currentCreds?.expiresAt > new Date()) {
      return currentCreds?.accessToken;
    } else {
      const updatedCreds = await exchangeForTokens({
        ...EXCHANGE_CONSTANTS,
        grant_type: "refresh_token",

        refresh_token: currentCreds?.refreshToken,
      });
      if (updatedCreds instanceof Error) {
        throw updatedCreds;
      } else {
        return updatedCreds?.accessToken;
      }
    }
  } catch (error) {
    handleError(error, 'There was an issue getting or exchanging access tokens ', true)
  }
};

export { authUrl, exchangeForTokens, redeemCode, getAccessToken, prisma, hubspotClient };
