import { execute } from "./db";

export const ORDER_STATUSES = ["cooling_period", "active", "completed", "refunded"] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

export function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}

export async function advanceExpiredCoolingPeriodOrders(): Promise<void> {
  await execute(
    `
      UPDATE orders
      SET status = 'active', updated_at = NOW()
      WHERE status = 'cooling_period'
        AND created_at <= NOW() - INTERVAL '7 days'
    `
  );
}
