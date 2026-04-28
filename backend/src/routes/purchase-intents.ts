import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import type { AuthContext, PurchaseIntentCreateInput } from "../types";
import { badRequest, created, notFound, ok } from "../lib/response";
import { query, execute } from "../lib/db";
import { createCoolingPeriodOrderFromIntent } from "./orders";
import { upsertUserFromAuth } from "../lib/user-repo";

type IntentRow = {
  intent_id: number;
  user_id: string;
  status: "draft" | "submitted" | "cancelled";
  product_code: string;
  quantity: number;
  currency: string;
  amount: string;
  note: string | null;
  payment_provider: string | null;
  payment_ref: string | null;
  paid_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

function parseJson(event: APIGatewayProxyEventV2): Record<string, unknown> | null {
  if (!event.body) {
    return null;
  }
  try {
    return JSON.parse(event.body);
  } catch {
    return null;
  }
}

function parseCreateInput(payload: Record<string, unknown>): PurchaseIntentCreateInput | null {
  const productCode = payload.productCode;
  const quantity = payload.quantity;
  const currency = payload.currency;
  const amount = payload.amount;
  const note = payload.note;

  if (typeof productCode !== "string" || productCode.trim().length < 2 || productCode.trim().length > 100) {
    return null;
  }
  if (!Number.isInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 100) {
    return null;
  }
  if (typeof currency !== "string" || currency.trim().length !== 3) {
    return null;
  }
  if (typeof amount !== "number" || amount <= 0) {
    return null;
  }
  if (note !== undefined && note !== null && typeof note !== "string") {
    return null;
  }

  return {
    productCode: productCode.trim(),
    quantity: Number(quantity),
    currency: currency.trim().toUpperCase(),
    amount: Number(amount),
    note: typeof note === "string" ? note.trim() : null
  };
}

function mapIntent(row: IntentRow) {
  return {
    intentId: String(row.intent_id),
    status: row.status,
    productCode: row.product_code,
    quantity: row.quantity,
    currency: row.currency,
    amount: Number(row.amount),
    note: row.note,
    paymentProvider: row.payment_provider,
    paymentRef: row.payment_ref,
    paidAt: row.paid_at,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function createPurchaseIntent(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  await upsertUserFromAuth(auth);
  const payload = parseJson(event);
  if (!payload) {
    return badRequest("Invalid JSON body");
  }
  const input = parseCreateInput(payload);
  if (!input) {
    return badRequest("Invalid purchase intent payload");
  }

  const rows = await query<{ intent_id: number }>(
    `
      INSERT INTO purchase_intents (
        user_id, status, product_code, quantity, currency, amount, note, created_at, updated_at
      ) VALUES (
        $1, 'draft', $2, $3, $4, $5, $6, NOW(), NOW()
      )
      RETURNING intent_id
    `,
    [auth.userId, input.productCode, input.quantity, input.currency, input.amount, input.note]
  );

  const intentId = String(rows[0].intent_id);
  return created({ intentId, status: "draft" });
}

export async function confirmPurchaseIntent(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  await upsertUserFromAuth(auth);
  const intentId = event.pathParameters?.id;
  if (!intentId) {
    return badRequest("Missing intent id");
  }

  const rows = await query<IntentRow>(
    `
      SELECT intent_id, user_id, status, product_code, quantity, currency, amount, note, payment_provider, payment_ref, paid_at, submitted_at, created_at, updated_at
      FROM purchase_intents
      WHERE intent_id = $1::bigint AND user_id = $2
      LIMIT 1
    `,
    [intentId, auth.userId]
  );

  const existing = rows[0];
  if (!existing) {
    return notFound("Purchase intent not found");
  }

  if (existing.status === "submitted") {
    return ok({ ...mapIntent(existing), idempotent: true });
  }

  if (existing.status === "cancelled") {
    return badRequest("Cancelled purchase intent cannot be confirmed");
  }

  await execute(
    `
      UPDATE purchase_intents
      SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
      WHERE intent_id = $1::bigint AND user_id = $2
    `,
    [intentId, auth.userId]
  );

  await execute(
    `
      UPDATE orders
      SET status = 'cooling_period', updated_at = NOW()
      WHERE source_intent_id = $1::bigint AND user_id = $2
    `,
    [intentId, auth.userId]
  );

  const existingOrderRows = await query<{ order_id: number }>(
    `
      SELECT order_id
      FROM orders
      WHERE source_intent_id = $1::bigint AND user_id = $2
      LIMIT 1
    `,
    [intentId, auth.userId]
  );
  if (!existingOrderRows[0]) {
    await createCoolingPeriodOrderFromIntent(auth.userId, existing.currency, Number(existing.amount), intentId);
  }

  const refreshed = await query<IntentRow>(
    `
      SELECT intent_id, user_id, status, product_code, quantity, currency, amount, note, payment_provider, payment_ref, paid_at, submitted_at, created_at, updated_at
      FROM purchase_intents
      WHERE intent_id = $1::bigint AND user_id = $2
      LIMIT 1
    `,
    [intentId, auth.userId]
  );

  return ok(mapIntent(refreshed[0]));
}
