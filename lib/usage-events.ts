import { emptyUsageSnapshot, getPlan, type UsageMetric, type UsageSnapshot } from "@/lib/usage-billing";

export type UsageEvent = {
  id: string;
  userId: string;
  metric: UsageMetric;
  quantity: number;
  sourceId?: string;
  occurredAt: string;
};

export type UsageLimitCheck = {
  allowed: boolean;
  metric: UsageMetric;
  used: number;
  requested: number;
  limit: number | null;
  remaining: number | null;
};

export const createUsageEvent = (
  userId: string,
  metric: UsageMetric,
  quantity = 1,
  sourceId?: string
): UsageEvent => ({
  id: `usage_${metric}_${Date.now()}`,
  userId,
  metric,
  quantity,
  sourceId,
  occurredAt: new Date().toISOString()
});

export const applyUsageEvent = (usage: UsageSnapshot, event: UsageEvent): UsageSnapshot => ({
  ...usage,
  [event.metric]: usage[event.metric] + event.quantity
});

export const checkUsageLimit = (
  usage: UsageSnapshot,
  metric: UsageMetric,
  requestedQuantity = 1
): UsageLimitCheck => {
  const plan = getPlan(usage.planId);
  const limit = plan.limits[metric] ?? null;
  const used = usage[metric];
  const remaining = limit === null ? null : Math.max(limit - used, 0);

  return {
    allowed: limit === null || used + requestedQuantity <= limit,
    metric,
    used,
    requested: requestedQuantity,
    limit,
    remaining
  };
};

export const trackUsageAgainstSnapshot = (
  userId: number,
  usage: UsageSnapshot,
  metric: UsageMetric,
  quantity = 1,
  sourceId?: string
) => {
  const event = createUsageEvent(String(userId), metric, quantity, sourceId);
  const limitCheck = checkUsageLimit(usage, metric, quantity);

  return {
    accepted: limitCheck.allowed,
    event,
    limitCheck,
    projectedUsage: limitCheck.allowed ? applyUsageEvent(usage, event) : usage
  };
};

export const trackEmptyUsage = (userId: number, metric: UsageMetric, quantity = 1, sourceId?: string) =>
  trackUsageAgainstSnapshot(userId, emptyUsageSnapshot, metric, quantity, sourceId);
