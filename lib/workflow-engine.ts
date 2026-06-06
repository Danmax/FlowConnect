import { connectorRegistry } from "@/lib/connector-sdk";
import { validateDataPillReferences } from "@/lib/dot-walk";
import { checkUsageLimit } from "@/lib/usage-events";
import { emptyUsageSnapshot, type UsageSnapshot } from "@/lib/usage-billing";

export type WorkflowStepType = "trigger" | "transform" | "ai_action" | "function" | "connector_action" | "rest_api";

export type WorkflowStep = {
  id: string;
  type: WorkflowStepType;
  name: string;
  connectorId?: string;
  action?: string;
  inputBindings?: Record<string, string>;
  outputFields?: string[];
  config: Record<string, unknown>;
};

export type WorkflowDraft = {
  id: string;
  userId: string;
  name: string;
  status: "draft" | "published" | "active" | "inactive";
  sourceTemplateId?: string;
  steps: WorkflowStep[];
  databaseId?: number;
};

export const validateWorkflowForActivation = (workflow: WorkflowDraft, usage: UsageSnapshot = emptyUsageSnapshot) => {
  const errors: string[] = [];
  const runLimit = workflow.status === "active" ? checkUsageLimit(usage, "activeWorkflows", 1) : { allowed: true };

  if (!workflow.steps.some((step) => step.type === "trigger")) {
    errors.push("Workflow needs one trigger step.");
  }

  const availablePaths = new Set<string>();

  workflow.steps.forEach((step) => {
    Object.entries(step.inputBindings ?? {}).forEach(([field, value]) => {
      validateDataPillReferences(value, availablePaths).forEach((error) => {
        errors.push(`${step.name} ${field}: ${error}`);
      });
    });

    if (!step.connectorId) {
      step.outputFields?.forEach((field) => availablePaths.add(`${step.id}.${field}`));
      return;
    }

    const connector = connectorRegistry.find((item) => item.id === step.connectorId);

    if (!connector) {
      errors.push(`${step.name} uses an unknown connector: ${step.connectorId}.`);
      return;
    }

    if (step.type === "trigger" && step.action && !connector.availableTriggers.includes(step.action)) {
      errors.push(`${step.action} is not available as a trigger on ${connector.appName}.`);
    }

    if (step.type === "connector_action" && step.action && !connector.availableActions.includes(step.action)) {
      errors.push(`${step.action} is not available on ${connector.appName}.`);
    }

    step.outputFields?.forEach((field) => availablePaths.add(`${step.id}.${field}`));
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
