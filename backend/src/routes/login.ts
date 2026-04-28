import {
  AdminInitiateAuthCommand,
  ChangePasswordCommand,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  CognitoIdentityProviderClient,
  ForgotPasswordCommand,
  SignUpCommand
} from "@aws-sdk/client-cognito-identity-provider";
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { getConfig } from "../config";
import { verifyToken } from "../lib/auth";
import { badRequest, ok, unauthorized } from "../lib/response";
import type { AuthContext } from "../types";

type LoginBody = {
  username?: unknown;
  password?: unknown;
  email?: unknown;
  code?: unknown;
  name?: unknown;
  newPassword?: unknown;
  previousPassword?: unknown;
  accessToken?: unknown;
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

export async function memberRegister(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  const body = parseBody(event);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!email || !password) {
    return badRequest("请输入邮箱和密码");
  }

  try {
    await cognitoClient().send(new SignUpCommand({
      ClientId: getConfig().cognitoClientId,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        ...(name ? [{ Name: "name", Value: name }] : [])
      ]
    }));

    return ok({ status: "confirmation_required", email });
  } catch (error) {
    return cognitoError(error, "注册失败");
  }
}

export async function confirmMemberRegister(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  const body = parseBody(event);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!email || !code) {
    return badRequest("请输入邮箱和验证码");
  }

  try {
    await cognitoClient().send(new ConfirmSignUpCommand({
      ClientId: getConfig().cognitoClientId,
      Username: email,
      ConfirmationCode: code
    }));

    return ok({ status: "confirmed", email });
  } catch (error) {
    return cognitoError(error, "邮箱验证失败");
  }
}

export async function forgotMemberPassword(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  const body = parseBody(event);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email) {
    return badRequest("请输入邮箱");
  }

  try {
    await cognitoClient().send(new ForgotPasswordCommand({
      ClientId: getConfig().cognitoClientId,
      Username: email
    }));

    return ok({ status: "code_sent", email });
  } catch (error) {
    return cognitoError(error, "发送重置验证码失败");
  }
}

export async function resetMemberPassword(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  const body = parseBody(event);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!email || !code || !newPassword) {
    return badRequest("请输入邮箱、验证码和新密码");
  }

  try {
    await cognitoClient().send(new ConfirmForgotPasswordCommand({
      ClientId: getConfig().cognitoClientId,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword
    }));

    return ok({ status: "password_reset", email });
  } catch (error) {
    return cognitoError(error, "重置密码失败");
  }
}

export async function changeMemberPassword(
  event: APIGatewayProxyEventV2,
  _auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  const body = parseBody(event);
  const previousPassword = typeof body?.previousPassword === "string" ? body.previousPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  const accessToken = typeof body?.accessToken === "string" ? body.accessToken.trim() : "";

  if (!previousPassword || !newPassword || !accessToken) {
    return badRequest("请输入原密码、新密码，并重新登录后再试");
  }

  try {
    await cognitoClient().send(new ChangePasswordCommand({
      AccessToken: accessToken,
      PreviousPassword: previousPassword,
      ProposedPassword: newPassword
    }));

    return ok({ status: "password_changed" });
  } catch (error) {
    return cognitoError(error, "修改密码失败");
  }
}

function cognitoError(error: unknown, fallback: string): APIGatewayProxyStructuredResultV2 {
  const name = typeof error === "object" && error && "name" in error ? String(error.name) : "";
  if (name === "UsernameExistsException") return badRequest("该邮箱已经注册，请直接登录");
  if (name === "CodeMismatchException") return badRequest("验证码不正确");
  if (name === "ExpiredCodeException") return badRequest("验证码已过期，请重新获取");
  if (name === "InvalidPasswordException") return badRequest("密码不符合规则，请使用更强的密码");
  if (name === "LimitExceededException") return badRequest("请求过于频繁，请稍后再试");
  if (name === "NotAuthorizedException") return unauthorized("认证失败，请检查账号或密码");
  if (name === "UserNotFoundException") return unauthorized("账号不存在");
  console.error(fallback, error);
  return badRequest(fallback);
}
