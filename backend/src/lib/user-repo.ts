import type { AuthContext, UserProfile } from "../types";
import { execute, query } from "./db";

export type UserRow = {
  user_id: string;
  email: string | null;
  phone_number: string | null;
  display_name: string | null;
  country_code: string | null;
  avatar_url: string | null;
  login_providers: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string;
};

export async function upsertUserFromAuth(auth: AuthContext): Promise<void> {
  const providers = JSON.stringify(auth.providerNames);
  await execute(
    `
      INSERT INTO users (
        user_id, email, phone_number, login_providers, last_login_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4::jsonb, NOW(), NOW(), NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        phone_number = EXCLUDED.phone_number,
        login_providers = EXCLUDED.login_providers,
        last_login_at = NOW(),
        updated_at = NOW()
    `,
    [auth.userId, auth.email, auth.phoneNumber, providers]
  );
}

export async function getUserById(userId: string): Promise<UserRow | null> {
  const rows = await query<UserRow>(
    `
      SELECT user_id, email, phone_number, display_name, country_code, avatar_url, login_providers, created_at, updated_at, last_login_at
      FROM users
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );
  return rows[0] ?? null;
}

export async function updateUserProfile(userId: string, profile: UserProfile): Promise<void> {
  await execute(
    `
      UPDATE users
      SET
        display_name = $1,
        country_code = $2,
        phone_number = $3,
        avatar_url = $4,
        updated_at = NOW()
      WHERE user_id = $5
    `,
    [profile.displayName, profile.countryCode, profile.phoneNumber, profile.avatarUrl, userId]
  );
}
