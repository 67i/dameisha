import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { requireAuth } from "./lib/auth";
import { internalError, notFound, ok, unauthorized } from "./lib/response";
import { getMe, getMeSecurity, patchMe } from "./routes/me";
import { getOrderById, getOrders } from "./routes/orders";
import { confirmPurchaseIntent, createPurchaseIntent } from "./routes/purchase-intents";
import { execute } from "./lib/db";
import type { AuthContext } from "./types";

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
  handle: (event: APIGatewayProxyEventV2, auth: AuthContext | null) => Promise<APIGatewayProxyResultV2>;
};

const routes: RouteMatch[] = [
  {
    method: "GET",
    regex: /^\/health$/,
    protected: false,
    handle: async () => ok({ status: "ok", service: "qx-serverless-api" })
  },
  {
    method: "GET",
    regex: /^\/me$/,
    protected: true,
    handle: async (_event, auth) => {
      return getMe(auth!);
    }
  },
  {
    method: "PATCH",
    regex: /^\/me$/,
    protected: true,
    handle: async (event, auth) => {
      return patchMe(event, auth!);
    }
  },
  {
    method: "GET",
    regex: /^\/me\/security$/,
    protected: true,
    handle: async (_event, auth) => {
      return getMeSecurity(auth!);
    }
  },
  {
    method: "GET",
    regex: /^\/orders$/,
    protected: true,
    handle: async (event, auth) => {
      return getOrders(event, auth!);
    }
  },
  {
    method: "GET",
    regex: /^\/orders\/(\d+)$/,
    protected: true,
    handle: async (event, auth) => {
      const id = event.rawPath.split("/").pop();
      event.pathParameters = { ...(event.pathParameters ?? {}), id };
      return getOrderById(event, auth!);
    }
  },
  {
    method: "POST",
    regex: /^\/purchase\/intents$/,
    protected: true,
    handle: async (event, auth) => {
      return createPurchaseIntent(event, auth!);
    }
  },
  {
    method: "POST",
    regex: /^\/purchase\/intents\/(\d+)\/confirm$/,
    protected: true,
    handle: async (event, auth) => {
      const id = event.rawPath.split("/")[3];
      event.pathParameters = { ...(event.pathParameters ?? {}), id };
      return confirmPurchaseIntent(event, auth!);
    }
  }
];

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const method = event.requestContext.http.method.toUpperCase();
    const path = event.rawPath;

    const route = routes.find((r) => r.method === method && r.regex.test(path));
    if (!route) {
      const res = notFound("Route not found");
      await writeAuditLog(event, null, responseStatusCode(res));
      return res;
    }

    const auth = route.protected ? await requireAuth(event) : null;
    if (route.protected && !auth) {
      const res = unauthorized();
      await writeAuditLog(event, null, responseStatusCode(res));
      return res;
    }

    const result = await route.handle(event, auth);
    await writeAuditLog(event, auth?.userId ?? null, responseStatusCode(result));
    return result;
  } catch (error) {
    console.error("Unhandled error", error);
    return internalError();
  }
};
