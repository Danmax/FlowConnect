export type UsageMetric =
  | "workflowRuns"
  | "apiCalls"
  | "aiActionUsage"
  | "activeWorkflows"
  | "activeConnections"
  | "formSubmissions"
  | "storageMb";

export type PricingPlanId = "starter" | "pro" | "enterprise";

export type PricingPlan = {
  id: PricingPlanId;
  name: string;
  monthlyPrice: string;
  limits: Partial<Record<UsageMetric, number>>;
  features: string[];
};

export type UsageSnapshot = Record<UsageMetric, number> & {
  planId: PricingPlanId;
  periodStart: string;
  periodEnd: string;
};

export const pricingPlans: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: "$0",
    limits: {
      workflowRuns: 100,
      activeWorkflows: 3,
      activeConnections: 3
    },
    features: ["100 workflow runs/month", "3 active workflows", "3 connections"]
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: "$29",
    limits: {
      workflowRuns: 5000,
      activeWorkflows: 25,
      activeConnections: 25
    },
    features: ["5,000 workflow runs/month", "25 active workflows", "25 connections"]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: "Custom",
    limits: {},
    features: ["Custom limits", "Priority support", "Advanced security"]
  }
];

export const usageMetricLabels: Record<UsageMetric, string> = {
  workflowRuns: "Workflow runs",
  apiCalls: "API calls",
  aiActionUsage: "AI action usage",
  activeWorkflows: "Active workflows",
  activeConnections: "Active connections",
  formSubmissions: "Form submissions",
  storageMb: "Storage usage"
};

export const demoUsage: UsageSnapshot = {
  planId: "pro",
  periodStart: "2026-06-01",
  periodEnd: "2026-06-30",
  workflowRuns: 1842,
  apiCalls: 9321,
  aiActionUsage: 412,
  activeWorkflows: 11,
  activeConnections: 14,
  formSubmissions: 287,
  storageMb: 742
};

export const getPlan = (id: PricingPlanId) => pricingPlans.find((plan) => plan.id === id) ?? pricingPlans[0];

export const getUsageSummary = (usage: UsageSnapshot) => {
  const plan = getPlan(usage.planId);
  const workflowRunLimit = plan.limits.workflowRuns;
  const remainingWorkflowRuns =
    typeof workflowRunLimit === "number" ? Math.max(workflowRunLimit - usage.workflowRuns, 0) : null;
  const workflowRunPercent =
    typeof workflowRunLimit === "number" ? Math.min(Math.round((usage.workflowRuns / workflowRunLimit) * 100), 100) : 0;

  return {
    plan,
    remainingWorkflowRuns,
    workflowRunPercent,
    isNearLimit: remainingWorkflowRuns !== null && workflowRunPercent >= 80
  };
};
