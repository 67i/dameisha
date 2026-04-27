import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export function json(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(body)
  };
}

export function ok(body: unknown): APIGatewayProxyStructuredResultV2 {
  return json(200, body);
}

export function created(body: unknown): APIGatewayProxyStructuredResultV2 {
  return json(201, body);
}

export function badRequest(message: string): APIGatewayProxyStructuredResultV2 {
  return json(400, { message });
}

export function unauthorized(message = "Unauthorized"): APIGatewayProxyStructuredResultV2 {
  return json(401, { message });
}

export function forbidden(message = "Forbidden"): APIGatewayProxyStructuredResultV2 {
  return json(403, { message });
}

export function notFound(message = "Not Found"): APIGatewayProxyStructuredResultV2 {
  return json(404, { message });
}

export function internalError(message = "Internal Server Error"): APIGatewayProxyStructuredResultV2 {
  return json(500, { message });
}

