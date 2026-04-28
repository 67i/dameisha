export type AuthContext = {
  userId: string;
  email: string | null;
  phoneNumber: string | null;
  providerNames: string[];
  rawClaims: Record<string, unknown>;
};

export type AdminRole = "super_admin" | "admin" | "dealer";

export type UserProfile = {
  displayName: string | null;
  countryCode: string | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
};

export type PurchaseIntentCreateInput = {
  productCode: string;
  quantity: number;
  currency: string;
  amount: number;
  note: string | null;
};
