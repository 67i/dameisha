import {
  AdminInitiateAuthCommand,
  CognitoIdentityProviderClient
} from "@aws-sdk/client-cognito-identity-provider";
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { getConfig } from "../config";
import { verifyToken } from "../lib/auth";
import { badRequest, ok, unauthorized } from "../lib/response";

type LoginBody = {
  username?: unknown;
  password?: unknown;
};

let client: CognitoIdentityProviderClient | null = null;

function cognitoClient(): CognitoIdentityProviderClient {
  if (client) return client;
  client = new CognitoIdentityProviderClient({ region: getConfig().awsRegion });
  return client;
}

function parseBody(event: APIGatewayProxyEventV2): LoginBody | null {
  if (!event.body) return null;
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
    return JSON.parse(raw) as LoginBody;
  } catch {
    return null;
  }
}

export async function memberLogin(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  const body = parseBody(event);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return badRequest("请输入用户名和密码");
  }

  const config = getConfig();
  try {
    const result = await cognitoClient().send(new AdminInitiateAuthCommand({
      UserPoolId: config.cognitoUserPoolId,
      ClientId: config.cognitoClientId,
      AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      }
    }));

    if (result.ChallengeName) {
      return badRequest(`登录需要处理 ${result.ChallengeName}，请先完成账号密码设置`);
    }

    const auth = result.AuthenticationResult;
    if (!auth?.IdToken) {
      return unauthorized("登录失败");
    }

    const verified = await verifyToken(auth.IdToken);
    if (!verified) {
      return unauthorized("登录失败");
    }

    return ok({
      idToken: auth.IdToken,
      accessToken: auth.AccessToken ?? null,
      refreshToken: auth.RefreshToken ?? null,
      expiresIn: auth.ExpiresIn ?? null,
      tokenType: auth.TokenType ?? "Bearer",
      user: {
        userId: verified.userId,
        email: verified.email
      }
    });
  } catch (error) {
    const name = typeof error === "object" && error && "name" in error ? String(error.name) : "";
    if (name === "NotAuthorizedException" || name === "UserNotFoundException") {
      return unauthorized("用户名或密码错误");
    }
    console.error("Member login failed", error);
    return unauthorized("登录失败");
  }
}
