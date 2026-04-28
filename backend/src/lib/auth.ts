import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";
import { getConfig } from "../config";
import type { AuthContext } from "../types";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (jwks) {
    return jwks;
  }

  const config = getConfig();
  const jwksUrl = new URL(
    `https://cognito-idp.${config.awsRegion}.amazonaws.com/${config.cognitoUserPoolId}/.well-known/jwks.json`
  );
  jwks = createRemoteJWKSet(jwksUrl);
  return jwks;
}

function parseProviders(payload: JWTPayload): string[] {
  const identitiesRaw = payload.identities;
  if (typeof identitiesRaw !== "string") {
    return ["COGNITO"];
  }

  try {
    const parsed = JSON.parse(identitiesRaw) as Array<{ providerName?: string }>;
    const providers = parsed.map((x) => x.providerName).filter(Boolean) as string[];
    return providers.length > 0 ? providers : ["COGNITO"];
  } catch {
    return ["COGNITO"];
  }
}

function authHeader(event: APIGatewayProxyEventV2): string | undefined {
  const raw = event.headers.authorization ?? event.headers.Authorization;
  return raw?.trim();
}

export async function verifyToken(token: string): Promise<AuthContext | null> {
  const config = getConfig();
  const issuer = `https://cognito-idp.${config.awsRegion}.amazonaws.com/${config.cognitoUserPoolId}`;

  const verified = await jwtVerify(token, getJwks(), {
    issuer,
    audience: config.cognitoClientId
  });

  const payload = verified.payload;
  if (!payload.sub || typeof payload.sub !== "string") {
    return null;
  }

  return {
    userId: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
    phoneNumber: typeof payload.phone_number === "string" ? payload.phone_number : null,
    providerNames: parseProviders(payload),
    rawClaims: payload as Record<string, unknown>
  };
}

export async function requireAuth(event: APIGatewayProxyEventV2): Promise<AuthContext | null> {
  const header = authHeader(event);
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  return verifyToken(header.slice("Bearer ".length));
}
