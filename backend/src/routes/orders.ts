import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import type { AuthContext } from "../types";
import { badRequest, notFound, ok } from "../lib/response";
import { query } from "../lib/db";
import { upsertUserFromAuth } from "../lib/user-repo";
import { advanceExpiredCoolingPeriodOrders, type OrderStatus } from "../lib/order-status";

type OrderRow = {
  order_id: number;
  user_id: string;
  status: OrderStatus;
  currency: string;
  amount: string;
  source_intent_id: number | null;
  created_at: string;
  updated_at: string;
};

type RefundRow = {
  refund_id: number;
  order_id: number;
  user_id: string;
  status: string;
  reason: string | null;
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

function parseJson(event: APIGatewayProxyEventV2): Record<string, unknown> | null {
  if (!event.body) return null;
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function parsePagination(event: APIGatewayProxyEventV2): { page: number; pageSize: number } | null {
  const pageRaw = event.queryStringParameters?.page ?? "1";
  const pageSizeRaw = event.queryStringParameters?.pageSize ?? "20";
  const page = Number(pageRaw);
  const pageSize = Number(pageSizeRaw);
  if (!Number.isInteger(page) || !Number.isInteger(pageSize) || page < 1 || pageSize < 1 || pageSize > 100) {
    return null;
  }
  return { page, pageSize };
}

export async function getOrders(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  await upsertUserFromAuth(auth);
  await advanceExpiredCoolingPeriodOrders();
  const pg = parsePagination(event);
  if (!pg) {
    return badRequest("Invalid pagination");
  }

  const offset = (pg.page - 1) * pg.pageSize;
  const rows = await query<OrderRow>(
    `
      SELECT order_id, user_id, status, currency, amount, source_intent_id, created_at, updated_at
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `,
    [auth.userId, pg.pageSize, offset]
  );

  const countRows = await query<{ total: string }>(
    `SELECT COUNT(1)::text AS total FROM orders WHERE user_id = $1`,
    [auth.userId]
  );
  const total = Number(countRows[0]?.total ?? 0);

  return ok({
    page: pg.page,
    pageSize: pg.pageSize,
    total,
    items: rows.map((row) => ({
      orderId: row.order_id,
      status: row.status,
      currency: row.currency,
      amount: Number(row.amount),
      sourceIntentId: row.source_intent_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  });
}

export async function getOrderById(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  await upsertUserFromAuth(auth);
  await advanceExpiredCoolingPeriodOrders();
  const orderId = event.pathParameters?.id;
  if (!orderId) {
    return badRequest("Missing order id");
  }

  const rows = await query<OrderRow>(
    `
      SELECT order_id, user_id, status, currency, amount, source_intent_id, created_at, updated_at
      FROM orders
      WHERE order_id = $1::bigint AND user_id = $2
      LIMIT 1
    `,
    [orderId, auth.userId]
  );

  if (!rows[0]) {
    return notFound("Order not found");
  }

  const row = rows[0];
  return ok({
    orderId: row.order_id,
    status: row.status,
    currency: row.currency,
    amount: Number(row.amount),
    sourceIntentId: row.source_intent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

export async function requestOrderRefund(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  await upsertUserFromAuth(auth);
  await advanceExpiredCoolingPeriodOrders();

  const orderId = event.pathParameters?.id;
  if (!orderId || !/^\d+$/.test(orderId)) {
    return badRequest("Invalid order id");
  }

  const body = parseJson(event) || {};
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length > 1000) {
    return badRequest("Refund reason is too long");
  }

  const orderRows = await query<OrderRow>(
    `
      SELECT order_id, user_id, status, currency, amount, source_intent_id, created_at, updated_at
      FROM orders
      WHERE order_id = $1::bigint AND user_id = $2
      LIMIT 1
    `,
    [orderId, auth.userId]
  );
  const order = orderRows[0];
  if (!order) {
    return notFound("Order not found");
  }
  if (order.status !== "cooling_period") {
    return badRequest("Only cooling period orders can request refund");
  }

  const allowedRows = await query<{ allowed: boolean }>(
    `SELECT ($1::timestamptz > NOW() - INTERVAL '7 days') AS allowed`,
    [order.created_at]
  );
  if (!allowedRows[0]?.allowed) {
    return badRequest("Cooling period has expired");
  }

  const existingRows = await query<RefundRow>(
    `
      SELECT refund_id, order_id, user_id, status, reason, admin_note, reviewed_at, created_at, updated_at
      FROM refund_requests
      WHERE order_id = $1::bigint AND status = 'pending'
      LIMIT 1
    `,
    [orderId]
  );
  if (existingRows[0]) {
    return ok({ refundId: existingRows[0].refund_id, status: existingRows[0].status, idempotent: true });
  }

  const refundRows = await query<RefundRow>(
    `
      INSERT INTO refund_requests (order_id, user_id, status, reason, created_at, updated_at)
      VALUES ($1::bigint, $2, 'pending', $3, NOW(), NOW())
      RETURNING refund_id, order_id, user_id, status, reason, admin_note, reviewed_at, created_at, updated_at
    `,
    [orderId, auth.userId, reason || null]
  );

  await query(
    `
      UPDATE orders
      SET status = 'refund_pending', updated_at = NOW()
      WHERE order_id = $1::bigint AND user_id = $2
    `,
    [orderId, auth.userId]
  );

  const refund = refundRows[0];
  return ok({
    refundId: refund.refund_id,
    orderId: refund.order_id,
    status: refund.status,
    reason: refund.reason,
    createdAt: refund.created_at
  });
}

export async function createCoolingPeriodOrderFromIntent(
  userId: string,
  currency: string,
  amount: number,
  intentId: string
): Promise<string> {
  const rows = await query<{ order_id: number }>(
    `
      INSERT INTO orders (user_id, status, currency, amount, source_intent_id, created_at, updated_at)
      VALUES ($1, 'cooling_period', $2, $3, $4::bigint, NOW(), NOW())
      RETURNING order_id
    `,
    [userId, currency, amount, intentId]
  );
  return String(rows[0].order_id);
}
