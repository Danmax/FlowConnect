import { connectorRegistry, type ConnectorDefinition } from "@/lib/connector-sdk";
import { getOpenAIConfig } from "@/lib/openai-config";
import type { WorkflowStep } from "@/lib/workflow-engine";

export type WorkflowProposal = {
  title: string;
  summary: string;
  connectorId: string;
  assumptions: string[];
  dataPills: string[];
  steps: WorkflowStep[];
  asyncFunction: string;
};

const systemPrompt = `You create FlowConnect workflow proposals.
Return only JSON. Build practical async API-style workflows.
Use these step types only: trigger, transform, ai_action, function, connector_action, rest_api.
Use data pills in inputBindings with {{step_id.path.to.field}} syntax.
Every step must include id, type, name, inputBindings, outputFields, and config.
Connector action steps must use a supported connector action from the provided connector catalog.`;

const fallbackProposal = (connector: ConnectorDefinition, prompt: string): WorkflowProposal => {
  const action = connector.availableActions[0] ?? "Call API";

  return {
    title: `${connector.appName} proposal`,
    summary: `Draft workflow proposal for: ${prompt}`,
    connectorId: connector.id,
    assumptions: [
      "A saved and healthy connection is available before activation.",
      "Field mappings can be adjusted after the proposal is created."
    ],
    dataPills: ["trigger.payload", "step_2.normalized.payload", "step_3.result.id"],
    steps: [
      {
        id: "trigger",
        type: "trigger",
        name: "Async API Request",
        inputBindings: {},
        outputFields: ["payload", "requestId", "submittedAt"],
        config: { triggerType: "async_api_request" }
      },
      {
        id: "step_2",
        type: "transform",
        name: "Normalize Request Payload",
        inputBindings: { payload: "{{trigger.payload}}" },
        outputFields: ["normalized.payload", "normalized.summary"],
        config: { mapType: "proposal_transform" }
      },
      {
        id: "step_3",
        type: "connector_action",
        name: `${connector.appName} ${action}`,
        connectorId: connector.id,
        action,
        inputBindings: { body: "{{step_2.normalized.payload}}" },
        outputFields: ["result.id", "result.status", "result.raw"],
        config: { docsUrl: connector.apiDocsUrl }
      }
    ],
    asyncFunction: `export async function flowConnectHandler({ input, connections, run }) {
  const normalized = await run.step("Normalize Request Payload", async () => input.payload);
  const result = await connections.${connector.id.replace(/-/g, "_")}.${action.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase()}(normalized);
  return { status: "completed", result };
}`
  };
};

const coerceProposal = (value: unknown, connector: ConnectorDefinition, prompt: string): WorkflowProposal => {
  const proposal = value as Partial<WorkflowProposal>;
  const fallback = fallbackProposal(connector, prompt);

  return {
    title: proposal.title ?? fallback.title,
    summary: proposal.summary ?? fallback.summary,
    connectorId: connector.id,
    assumptions: Array.isArray(proposal.assumptions) ? proposal.assumptions : fallback.assumptions,
    dataPills: Array.isArray(proposal.dataPills) ? proposal.dataPills : fallback.dataPills,
    steps: Array.isArray(proposal.steps) && proposal.steps.length > 0 ? proposal.steps : fallback.steps,
    asyncFunction: proposal.asyncFunction ?? fallback.asyncFunction
  };
};

export const createAIWorkflowProposal = async ({
  connectorId,
  prompt
}: {
  connectorId: string;
  prompt: string;
}) => {
  const connector = connectorRegistry.find((item) => item.id === connectorId);

  if (!connector) {
    throw new Error("Connector not found.");
  }

  const config = getOpenAIConfig();
  const connectorContext = {
    id: connector.id,
    appName: connector.appName,
    authType: connector.authType,
    availableTriggers: connector.availableTriggers,
    availableActions: connector.availableActions,
    actionCatalog: connector.actionCatalog,
    rateLimitRules: connector.rateLimitRules,
    errorHandlingRules: connector.errorHandlingRules
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      input: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            userPrompt: prompt,
            connector: connectorContext,
            requiredShape: {
              title: "string",
              summary: "string",
              connectorId: connector.id,
              assumptions: ["string"],
              dataPills: ["trigger.payload"],
              steps: [
                {
                  id: "trigger",
                  type: "trigger",
                  name: "string",
                  connectorId: "optional string",
                  action: "optional string",
                  inputBindings: {},
                  outputFields: ["payload"],
                  config: {}
                }
              ],
              asyncFunction: "string"
            }
          })
        }
      ],
      text: {
        format: { type: "json_object" }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI proposal request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };
  const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text;

  if (!text) {
    throw new Error("OpenAI returned an empty proposal.");
  }

  return coerceProposal(JSON.parse(text) as unknown, connector, prompt);
};
