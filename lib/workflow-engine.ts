import { connectorRegistry } from "@/lib/connector-sdk";
import { checkUsageLimit } from "@/lib/usage-events";
import { demoUsage } from "@/lib/usage-billing";

export type WorkflowStepType = "trigger" | "transform" | "ai_action" | "function" | "connector_action" | "rest_api";

export type WorkflowStep = {
  id: string;
  type: WorkflowStepType;
  name: string;
  connectorId?: string;
  action?: string;
  config: Record<string, unknown>;
};

export type WorkflowDraft = {
  id: string;
  userId: string;
  name: string;
  status: "draft" | "active" | "inactive";
  steps: WorkflowStep[];
};

export const validateWorkflowForActivation = (workflow: WorkflowDraft) => {
  const errors: string[] = [];
  const runLimit = checkUsageLimit(demoUsage, "activeWorkflows", workflow.status === "active" ? 0 : 1);

  if (!workflow.steps.some((step) => step.type === "trigger")) {
    errors.push("Workflow needs one trigger step.");
  }

  workflow.steps.forEach((step) => {
    if (!step.connectorId) {
      return;
    }

    const connector = connectorRegistry.find((item) => item.id === step.connectorId);

    if (!connector) {
      errors.push(`${step.name} uses an unknown connector: ${step.connectorId}.`);
      return;
    }

    if (step.action && !connector.availableActions.includes(step.action)) {
      errors.push(`${step.action} is not available on ${connector.appName}.`);
    }
  });

  if (!runLimit.allowed) {
    errors.push("Active workflow limit reached for the current plan.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export const createWorkflowRunRecord = (workflow: WorkflowDraft, triggerData: Record<string, unknown>) => ({
  id: `run_${workflow.id}_${Date.now()}`,
  workflowId: workflow.id,
  userId: workflow.userId,
  triggerData,
  status: "pending" as const,
  retryCount: 0,
  createdAt: new Date().toISOString()
});
