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
