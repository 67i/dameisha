import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import type { AdminRole, AuthContext } from "../types";
import { badRequest, forbidden, notFound, ok } from "../lib/response";
import { query } from "../lib/db";

const ADMIN_ROLES: AdminRole[] = ["super_admin", "admin", "dealer"];

type Pagination = {
  page: number;
  pageSize: number;
};

type CountRow = {
  total: string;
};

type StatusCountRow = {
  status: string;
  total: string;
};

type DashboardTotalRow = {
  total_users: string;
  total_orders: string;
  total_purchase_intents: string;
  total_revenue: string | null;
  submitted_orders: string;
  draft_orders: string;
  cancelled_orders: string;
  audit_events: string;
};

type TrendRow = {
  day: string;
  orders: string;
  revenue: string | null;
};

type AdminOrderRow = {
  order_id: number;
  user_id: string;
  status: string;
  currency: string;
  amount: string;
  source_intent_id: number | null;
  user_email: string | null;
  user_phone_number: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

type AdminOrderDetailRow = AdminOrderRow & {
  note: string | null;
  product_code: string | null;
  quantity: number | null;
  payment_provider: string | null;
  payment_ref: string | null;
  paid_at: string | null;
  submitted_at: string | null;
};

type AdminIntentRow = {
  intent_id: number;
  user_id: string;
  status: string;
  product_code: string;
  quantity: number;
  currency: string;
  amount: string;
  note: string | null;
  payment_provider: string | null;
  payment_ref: string | null;
  paid_at: string | null;
  submitted_at: string | null;
  user_email: string | null;
  created_at: string;
  updated_at: string;
};

type AdminUserRow = {
  user_id: string;
  email: string | null;
  phone_number: string | null;
  display_name: string | null;
  country_code: string | null;
  login_providers: string | null;
  last_login_at: string;
  created_at: string;
  updated_at: string;
  order_count: string;
  order_amount: string | null;
};

type AuditRow = {
  audit_id: number;
  user_id: string | null;
  method: string;
  route: string;
  status_code: number;
  request_id: string | null;
  created_at: string;
};

function claimArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === "string");
  }
  if (typeof value === "string") {
    return value.split(",").map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

export function getAdminRole(auth: AuthContext): AdminRole | null {
  const groups = claimArray(auth.rawClaims["cognito:groups"]);
  const customRole = auth.rawClaims["custom:role"];
  const roleValues = [
    ...groups,
    typeof customRole === "string" ? customRole : ""
  ].map((x) => x.toLowerCase());

  return ADMIN_ROLES.find((role) => roleValues.includes(role)) ?? null;
}

function ensureAdmin(auth: AuthContext): AdminRole | null {
  return getAdminRole(auth);
}

function parsePagination(event: APIGatewayProxyEventV2): Pagination | null {
  const pageRaw = event.queryStringParameters?.page ?? "1";
  const sizeRaw = event.queryStringParameters?.pageSize ?? event.queryStringParameters?.size ?? "20";
  const page = Number(pageRaw);
  const pageSize = Number(sizeRaw);

  if (!Number.isInteger(page) || !Number.isInteger(pageSize) || page < 1 || pageSize < 1 || pageSize > 100) {
    return null;
  }

  return { page, pageSize };
}

function success(data: unknown): APIGatewayProxyStructuredResultV2 {
  return ok({ code: 200, message: "success", data });
}

function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  return `${name.slice(0, 1)}***@${domain}`;
}

function hidden(value: string | null): string | null {
  return value ? "******" : null;
}

function requireAdminResponse(auth: AuthContext): AdminRole | APIGatewayProxyStructuredResultV2 {
  const role = ensureAdmin(auth);
  if (!role) {
    return forbidden("Admin permission required");
  }
  return role;
}

function parseJsonBody(event: APIGatewayProxyEventV2): Record<string, unknown> | null {
  if (!event.body) return null;
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function orderPayload(row: AdminOrderRow) {
  return {
    orderId: row.order_id,
    userId: row.user_id,
    userEmail: maskEmail(row.user_email),
    userPhoneNumber: hidden(row.user_phone_number),
    displayName: row.display_name,
    status: row.status,
    currency: row.currency,
    amount: Number(row.amount),
    sourceIntentId: row.source_intent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getAdminDashboard(auth: AuthContext): Promise<APIGatewayProxyStructuredResultV2> {
  const role = requireAdminResponse(auth);
  if (typeof role !== "string") return role;

  const totals = await query<DashboardTotalRow>(
    `
      SELECT
        (SELECT COUNT(1)::text FROM users) AS total_users,
        (SELECT COUNT(1)::text FROM orders) AS total_orders,
        (SELECT COUNT(1)::text FROM purchase_intents) AS total_purchase_intents,
        (SELECT COALESCE(SUM(amount), 0)::text FROM orders WHERE status = 'submitted') AS total_revenue,
        (SELECT COUNT(1)::text FROM orders WHERE status = 'submitted') AS submitted_orders,
        (SELECT COUNT(1)::text FROM orders WHERE status = 'draft') AS draft_orders,
        (SELECT COUNT(1)::text FROM orders WHERE status = 'cancelled') AS cancelled_orders,
        (SELECT COUNT(1)::text FROM audit_logs) AS audit_events
    `
  );

  const statusRows = await query<StatusCountRow>(
    `
      SELECT status, COUNT(1)::text AS total
      FROM orders
      GROUP BY status
      ORDER BY status
    `
  );

  const trendRows = await query<TrendRow>(
    `
      SELECT
        DATE(created_at)::text AS day,
        COUNT(1)::text AS orders,
        COALESCE(SUM(amount), 0)::text AS revenue
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '6 days'
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `
  );

  const total = totals[0];
  return success({
    role,
    totals: {
      users: Number(total?.total_users ?? 0),
      orders: Number(total?.total_orders ?? 0),
      purchaseIntents: Number(total?.total_purchase_intents ?? 0),
      revenue: Number(total?.total_revenue ?? 0),
      submittedOrders: Number(total?.submitted_orders ?? 0),
      draftOrders: Number(total?.draft_orders ?? 0),
      cancelledOrders: Number(total?.cancelled_orders ?? 0),
      auditEvents: Number(total?.audit_events ?? 0)
    },
    orderStatus: statusRows.map((row) => ({
      status: row.status,
      total: Number(row.total)
    })),
    trends: trendRows.map((row) => ({
      day: row.day,
      orders: Number(row.orders),
      revenue: Number(row.revenue ?? 0)
    }))
  });
}

export async function getAdminOrders(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  const role = requireAdminResponse(auth);
  if (typeof role !== "string") return role;

  const pg = parsePagination(event);
  if (!pg) return badRequest("Invalid pagination");

  const offset = (pg.page - 1) * pg.pageSize;
  const rows = await query<AdminOrderRow>(
    `
      SELECT
        o.order_id, o.user_id, o.status, o.currency, o.amount, o.source_intent_id,
        u.email AS user_email, u.phone_number AS user_phone_number, u.display_name,
        o.created_at, o.updated_at
      FROM orders o
      LEFT JOIN users u ON u.user_id = o.user_id
      ORDER BY o.created_at DESC
      LIMIT $1 OFFSET $2
    `,
    [pg.pageSize, offset]
  );
  const countRows = await query<CountRow>("SELECT COUNT(1)::text AS total FROM orders");

  return success({
    list: rows.map(orderPayload),
    page: pg.page,
    size: pg.pageSize,
    total: Number(countRows[0]?.total ?? 0)
  });
}

export async function getAdminOrderDetail(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  const role = requireAdminResponse(auth);
  if (typeof role !== "string") return role;

  const orderId = event.pathParameters?.id;
  if (!orderId || !/^\d+$/.test(orderId)) {
    return badRequest("Invalid order id");
  }

  const rows = await query<AdminOrderDetailRow>(
    `
      SELECT
        o.order_id, o.user_id, o.status, o.currency, o.amount, o.source_intent_id,
        u.email AS user_email, u.phone_number AS user_phone_number, u.display_name,
        o.created_at, o.updated_at,
        p.product_code, p.quantity, p.note, p.payment_provider, p.payment_ref, p.paid_at, p.submitted_at
      FROM orders o
      LEFT JOIN users u ON u.user_id = o.user_id
      LEFT JOIN purchase_intents p ON p.intent_id = o.source_intent_id
      WHERE o.order_id = $1::bigint
      LIMIT 1
    `,
    [orderId]
  );

  const row = rows[0];
  if (!row) {
    return notFound("Order not found");
  }

  return success({
    ...orderPayload(row),
    purchaseIntent: row.source_intent_id ? {
      intentId: row.source_intent_id,
      productCode: row.product_code,
      quantity: row.quantity,
      note: row.note,
      paymentProvider: row.payment_provider,
      paymentRef: row.payment_ref,
      paidAt: row.paid_at,
      submittedAt: row.submitted_at
    } : null
  });
}

export async function updateAdminOrderStatus(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  const role = requireAdminResponse(auth);
  if (typeof role !== "string") return role;

  const orderId = event.pathParameters?.id;
  if (!orderId || !/^\d+$/.test(orderId)) {
    return badRequest("Invalid order id");
  }

  const body = parseJsonBody(event);
  const status = typeof body?.status === "string" ? body.status : "";
  if (!["draft", "submitted", "cancelled"].includes(status)) {
    return badRequest("Invalid order status");
  }

  const rows = await query<AdminOrderRow>(
    `
      UPDATE orders
      SET status = $2, updated_at = NOW()
      WHERE order_id = $1::bigint
      RETURNING order_id, user_id, status, currency, amount, source_intent_id,
        NULL::text AS user_email, NULL::text AS user_phone_number, NULL::text AS display_name,
        created_at, updated_at
    `,
    [orderId, status]
  );

  const row = rows[0];
  if (!row) {
    return notFound("Order not found");
  }

  return success(orderPayload(row));
}

export async function getAdminPurchaseIntents(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  const role = requireAdminResponse(auth);
  if (typeof role !== "string") return role;

  const pg = parsePagination(event);
  if (!pg) return badRequest("Invalid pagination");

  const offset = (pg.page - 1) * pg.pageSize;
  const rows = await query<AdminIntentRow>(
    `
      SELECT
        p.intent_id, p.user_id, p.status, p.product_code, p.quantity, p.currency, p.amount,
        p.note, p.payment_provider, p.payment_ref, p.paid_at, p.submitted_at,
        u.email AS user_email, p.created_at, p.updated_at
      FROM purchase_intents p
      LEFT JOIN users u ON u.user_id = p.user_id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `,
    [pg.pageSize, offset]
  );
  const countRows = await query<CountRow>("SELECT COUNT(1)::text AS total FROM purchase_intents");

  return success({
    list: rows.map((row) => ({
      intentId: row.intent_id,
      userId: row.user_id,
      userEmail: maskEmail(row.user_email),
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
    })),
    page: pg.page,
    size: pg.pageSize,
    total: Number(countRows[0]?.total ?? 0)
  });
}

export async function getAdminUsers(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  const role = requireAdminResponse(auth);
  if (typeof role !== "string") return role;

  const pg = parsePagination(event);
  if (!pg) return badRequest("Invalid pagination");

  const offset = (pg.page - 1) * pg.pageSize;
  const rows = await query<AdminUserRow>(
    `
      SELECT
        u.user_id, u.email, u.phone_number, u.display_name, u.country_code,
        u.login_providers::text, u.last_login_at, u.created_at, u.updated_at,
        COUNT(o.order_id)::text AS order_count,
        COALESCE(SUM(o.amount), 0)::text AS order_amount
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.user_id
      GROUP BY u.user_id
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `,
    [pg.pageSize, offset]
  );
  const countRows = await query<CountRow>("SELECT COUNT(1)::text AS total FROM users");

  return success({
    list: rows.map((row) => ({
      userId: row.user_id,
      email: maskEmail(row.email),
      phoneNumber: hidden(row.phone_number),
      displayName: row.display_name,
      countryCode: row.country_code,
      providers: row.login_providers ? JSON.parse(row.login_providers) : [],
      orderCount: Number(row.order_count),
      orderAmount: Number(row.order_amount ?? 0),
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })),
    page: pg.page,
    size: pg.pageSize,
    total: Number(countRows[0]?.total ?? 0)
  });
}

export async function getAdminAuditLogs(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  const role = requireAdminResponse(auth);
  if (typeof role !== "string") return role;

  const pg = parsePagination(event);
  if (!pg) return badRequest("Invalid pagination");

  const offset = (pg.page - 1) * pg.pageSize;
  const rows = await query<AuditRow>(
    `
      SELECT audit_id, user_id, method, route, status_code, request_id, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `,
    [pg.pageSize, offset]
  );
  const countRows = await query<CountRow>("SELECT COUNT(1)::text AS total FROM audit_logs");

  return success({
    list: rows.map((row) => ({
      auditId: row.audit_id,
      userId: row.user_id,
      method: row.method,
      route: row.route,
      statusCode: row.status_code,
      requestId: row.request_id,
      createdAt: row.created_at
    })),
    page: pg.page,
    size: pg.pageSize,
    total: Number(countRows[0]?.total ?? 0)
  });
}
