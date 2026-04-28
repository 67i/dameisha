import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { requireAuth } from "./lib/auth";
import { internalError, noContent, notFound, ok, unauthorized } from "./lib/response";
import { getMe, getMeSecurity, patchMe } from "./routes/me";
import { getOrderById, getOrders, requestOrderRefund } from "./routes/orders";
import { confirmPurchaseIntent, createPurchaseIntent } from "./routes/purchase-intents";
import { execute } from "./lib/db";
import type { AuthContext } from "./types";
import {
  getAdminAuditLogs,
  getAdminDashboard,
  getAdminOrderDetail,
  getAdminOrders,
  getAdminPurchaseIntents,
  getAdminRefundRequests,
  getAdminUsers,
  reviewAdminRefundRequest,
  updateAdminOrderStatus
} from "./routes/admin";
import { adminLogin } from "./routes/admin-login";
import {
  changeMemberPassword,
  confirmMemberRegister,
  forgotMemberPassword,
  memberLogin,
  memberRegister,
  resetMemberPassword
} from "./routes/login";

async function writeAuditLog(event: APIGatewayProxyEventV2, userId: string | null, statusCode: number): Promise<void> {
  try {
    await execute(
      `
        INSERT INTO audit_logs (user_id, method, route, status_code, request_id, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `,
      [userId, event.requestContext.http.method, event.rawPath, statusCode, event.requestContext.requestId ?? null]
    );
  } catch (error) {
    console.error("Audit log write failed", error);
  }
}

function responseStatusCode(result: APIGatewayProxyResultV2): number {
  if (typeof result === "string") {
    return 200;
  }
  return result.statusCode ?? 200;
}

type RouteMatch = {
  method: string;
  regex: RegExp;
  protected: boolean;
  audit: boolean;
  handle: (event: APIGatewayProxyEventV2, auth: AuthContext | null, routePath: string) => Promise<APIGatewayProxyResultV2>;
};

function routePathFromEvent(event: APIGatewayProxyEventV2): string {
  const rawPath = event.rawPath || "/";
  const stage = event.requestContext.stage;
  if (stage && stage !== "$default") {
    const stagePrefix = `/${stage}`;
    if (rawPath === stagePrefix) {
      return "/";
    }
    if (rawPath.startsWith(`${stagePrefix}/`)) {
      return rawPath.slice(stagePrefix.length);
    }
  }
  return rawPath;
}

const routes: RouteMatch[] = [
  {
    method: "GET",
    regex: /^\/health$/,
    protected: false,
    audit: false,
    handle: async () => ok({ status: "ok", service: "qx-serverless-api" })
  },
  {
    method: "GET",
    regex: /^\/me$/,
    protected: true,
    audit: true,
    handle: async (_event, auth) => {
      return getMe(auth!);
    }
  },
  {
    method: "POST",
    regex: /^\/api\/v1\/login$/,
    protected: false,
    audit: false,
    handle: async (event) => {
      return memberLogin(event);
    }
  },
  {
    method: "POST",
    regex: /^\/api\/v1\/register$/,
    protected: false,
    audit: false,
    handle: async (event) => {
      return memberRegister(event);
    }
  },
  {
    method: "POST",
    regex: /^\/api\/v1\/register\/confirm$/,
    protected: false,
    audit: false,
    handle: async (event) => {
      return confirmMemberRegister(event);
    }
  },
  {
    method: "POST",
    regex: /^\/api\/v1\/password\/forgot$/,
    protected: false,
    audit: false,
    handle: async (event) => {
      return forgotMemberPassword(event);
    }
  },
  {
    method: "POST",
    regex: /^\/api\/v1\/password\/reset$/,
    protected: false,
    audit: false,
    handle: async (event) => {
      return resetMemberPassword(event);
    }
  },
  {
    method: "POST",
    regex: /^\/api\/v1\/password\/change$/,
    protected: true,
    audit: true,
    handle: async (event, auth) => {
      return changeMemberPassword(event, auth!);
    }
  },
  {
    method: "PATCH",
    regex: /^\/me$/,
    protected: true,
    audit: true,
    handle: async (event, auth) => {
      return patchMe(event, auth!);
    }
  },
  {
    method: "GET",
    regex: /^\/me\/security$/,
    protected: true,
    audit: true,
    handle: async (_event, auth) => {
      return getMeSecurity(auth!);
    }
  },
  {
    method: "GET",
    regex: /^\/orders$/,
    protected: true,
    audit: true,
    handle: async (event, auth) => {
      return getOrders(event, auth!);
    }
  },
  {
    method: "GET",
    regex: /^\/orders\/(\d+)$/,
    protected: true,
    audit: true,
    handle: async (event, auth, routePath) => {
      const id = routePath.split("/").pop();
      event.pathParameters = { ...(event.pathParameters ?? {}), id };
      return getOrderById(event, auth!);
    }
  },
  {
    method: "POST",
    regex: /^\/orders\/(\d+)\/refunds$/,
    protected: true,
    audit: true,
    handle: async (event, auth, routePath) => {
      const id = routePath.split("/")[2];
      event.pathParameters = { ...(event.pathParameters ?? {}), id };
      return requestOrderRefund(event, auth!);
    }
  },
  {
    method: "POST",
    regex: /^\/purchase\/intents$/,
    protected: true,
    audit: true,
    handle: async (event, auth) => {
      return createPurchaseIntent(event, auth!);
    }
  },
  {
    method: "POST",
    regex: /^\/purchase\/intents\/(\d+)\/confirm$/,
    protected: true,
    audit: true,
    handle: async (event, auth, routePath) => {
      const id = routePath.split("/")[3];
      event.pathParameters = { ...(event.pathParameters ?? {}), id };
      return confirmPurchaseIntent(event, auth!);
    }
  },
  {
    method: "GET",
    regex: /^\/api\/v1\/admin\/dashboard$/,
    protected: true,
    audit: true,
    handle: async (_event, auth) => {
      return getAdminDashboard(auth!);
    }
  },
  {
    method: "POST",
    regex: /^\/api\/v1\/admin\/login$/,
    protected: false,
    audit: false,
    handle: async (event) => {
      return adminLogin(event);
    }
  },
  {
    method: "GET",
    regex: /^\/api\/v1\/admin\/orders$/,
    protected: true,
    audit: true,
    handle: async (event, auth) => {
      return getAdminOrders(event, auth!);
    }
  },
  {
    method: "GET",
    regex: /^\/api\/v1\/admin\/orders\/(\d+)$/,
    protected: true,
    audit: true,
    handle: async (event, auth, routePath) => {
      const id = routePath.split("/").pop();
      event.pathParameters = { ...(event.pathParameters ?? {}), id };
      return getAdminOrderDetail(event, auth!);
    }
  },
  {
    method: "PATCH",
    regex: /^\/api\/v1\/admin\/orders\/(\d+)\/status$/,
    protected: true,
    audit: true,
    handle: async (event, auth, routePath) => {
      const id = routePath.split("/")[5];
      event.pathParameters = { ...(event.pathParameters ?? {}), id };
      return updateAdminOrderStatus(event, auth!);
    }
  },
  {
    method: "GET",
    regex: /^\/api\/v1\/admin\/purchase-intents$/,
    protected: true,
    audit: true,
    handle: async (event, auth) => {
      return getAdminPurchaseIntents(event, auth!);
    }
  },
  {
    method: "GET",
    regex: /^\/api\/v1\/admin\/refund-requests$/,
    protected: true,
    audit: true,
    handle: async (event, auth) => {
      return getAdminRefundRequests(event, auth!);
    }
  },
  {
    method: "PATCH",
    regex: /^\/api\/v1\/admin\/refund-requests\/(\d+)\/review$/,
    protected: true,
    audit: true,
    handle: async (event, auth, routePath) => {
      const id = routePath.split("/")[5];
      event.pathParameters = { ...(event.pathParameters ?? {}), id };
      return reviewAdminRefundRequest(event, auth!);
    }
  },
  {
    method: "GET",
    regex: /^\/api\/v1\/admin\/users$/,
    protected: true,
    audit: true,
    handle: async (event, auth) => {
      return getAdminUsers(event, auth!);
    }
  },
  {
    method: "GET",
    regex: /^\/api\/v1\/admin\/audit-logs$/,
    protected: true,
    audit: true,
    handle: async (event, auth) => {
      return getAdminAuditLogs(event, auth!);
    }
  }
];

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const method = event.requestContext.http.method.toUpperCase();
    if (method === "OPTIONS") {
      return noContent();
    }

    const path = routePathFromEvent(event);

    const route = routes.find((r) => r.method === method && r.regex.test(path));
    if (!route) {
      return notFound("Route not found");
    }

    let auth: AuthContext | null = null;
    if (route.protected) {
      try {
        auth = await requireAuth(event);
      } catch (error) {
        console.warn("Auth verification failed", error);
        return unauthorized();
      }
    }
    if (route.protected && !auth) {
      return unauthorized();
    }

    const result = await route.handle(event, auth, path);
    if (route.audit) {
      await writeAuditLog(event, auth?.userId ?? null, responseStatusCode(result));
    }
    return result;
  } catch (error) {
    console.error("Unhandled error", error);
    return internalError();
  }
};
