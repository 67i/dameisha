import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import type { AuthContext, UserProfile } from "../types";
import { badRequest, notFound, ok } from "../lib/response";
import { getUserById, updateUserProfile, upsertUserFromAuth } from "../lib/user-repo";

function parseJsonBody(event: APIGatewayProxyEventV2): Record<string, unknown> | null {
  if (!event.body) {
    return null;
  }
  try {
    return JSON.parse(event.body);
  } catch {
    return null;
  }
}

function parseProfile(payload: Record<string, unknown>): UserProfile | null {
  const displayName = payload.displayName;
  const countryCode = payload.countryCode;
  const phoneNumber = payload.phoneNumber;
  const avatarUrl = payload.avatarUrl;

  if (displayName !== undefined && displayName !== null && typeof displayName !== "string") {
    return null;
  }
  if (countryCode !== undefined && countryCode !== null && typeof countryCode !== "string") {
    return null;
  }
  if (phoneNumber !== undefined && phoneNumber !== null && typeof phoneNumber !== "string") {
    return null;
  }
  if (avatarUrl !== undefined && avatarUrl !== null && typeof avatarUrl !== "string") {
    return null;
  }

  return {
    displayName: (displayName as string | null | undefined) ?? null,
    countryCode: (countryCode as string | null | undefined) ?? null,
    phoneNumber: (phoneNumber as string | null | undefined) ?? null,
    avatarUrl: (avatarUrl as string | null | undefined) ?? null
  };
}

export async function getMe(auth: AuthContext): Promise<APIGatewayProxyStructuredResultV2> {
  await upsertUserFromAuth(auth);
  const user = await getUserById(auth.userId);

  if (!user) {
    return notFound("User not found");
  }

  return ok({
    userId: user.user_id,
    email: user.email,
    phoneNumber: user.phone_number,
    displayName: user.display_name,
    countryCode: user.country_code,
    avatarUrl: user.avatar_url,
    providers: user.login_providers ? JSON.parse(user.login_providers) : [],
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  });
}

export async function patchMe(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  const payload = parseJsonBody(event);
  if (!payload) {
    return badRequest("Invalid JSON body");
  }

  const profile = parseProfile(payload);
  if (!profile) {
    return badRequest("Invalid profile payload");
  }

  await upsertUserFromAuth(auth);
  await updateUserProfile(auth.userId, profile);
  return getMe(auth);
}

export async function getMeSecurity(auth: AuthContext): Promise<APIGatewayProxyStructuredResultV2> {
  await upsertUserFromAuth(auth);
  const user = await getUserById(auth.userId);
  if (!user) {
    return notFound("User not found");
  }

  return ok({
    userId: user.user_id,
    providers: user.login_providers ? JSON.parse(user.login_providers) : [],
    lastLoginAt: user.last_login_at,
    email: user.email,
    phoneNumber: user.phone_number
  });
}

