import { connectorRegistry, type ConnectorDefinition } from "@/lib/connector-sdk";
import { getOpenAIConfig, hasOpenAIConfig } from "@/lib/openai-config";

export type ConnectionGuide = {
  title: string;
  summary: string;
  userAccountSetup: string[];
  connectionSteps: string[];
  requiredCredentials: Array<{ key: string; description: string; required: boolean }>;
  scopes: string[];
  serviceNowSetup: {
    dynamicTables: string[];
    workflowOptions: string[];
    tableApiSteps: string[];
  };
  customAppSetup: {
    apiRequirements: string[];
    openApiCatalogSteps: string[];
    authOptions: string[];
  };
  workflowPlan: string[];
  testingChecklist: string[];
  securityNotes: string[];
};

const findConnector = (connectorId: string) =>
  connectorRegistry.find((connector) => connector.id === connectorId) ??
  connectorRegistry.find((connector) => connector.id === "custom-app");

const fallbackGuide = (connector: ConnectorDefinition, prompt: string): ConnectionGuide => ({
  title: `${connector.appName} connection setup guide`,
  summary: prompt || `Create a saved ${connector.appName} connection and map it into FlowConnect workflows.`,
  userAccountSetup:
    connector.id === "servicenow"
      ? [
          "Log in to the ServiceNow instance with admin access to Application Registry.",
          "Navigate to System OAuth > Application Registry.",
          "Select New, then create an OAuth API endpoint for external clients.",
          "Submit the record, then copy the generated Client ID and Client Secret.",
          "Grant the integration account only the table/API roles needed for the target tables and Flow Designer actions."
        ]
      : [
          `Create or confirm a ${connector.appName} user account dedicated to FlowConnect automation.`,
          "Grant only the roles/scopes required for the workflow actions you plan to run.",
          "Create credentials using the provider's official auth setup page, then store them in the FlowConnect connection form."
        ],
  connectionSteps:
    connector.id === "servicenow"
      ? [
          "Open Connectors, choose ServiceNow, and enter the instance URL such as https://example.service-now.com.",
          "Use either an existing access token/personal OAuth token or enter OAuth Client ID and Client Secret.",
          "If using client credentials, set Token URL to https://example.service-now.com/oauth_token.do or leave it blank to infer it from the instance URL.",
          "Save the connection, then run the live connection test against /api/now/table/sys_user?sysparm_limit=1.",
          "Use Run API Mapping to map ServiceNow table and Flow Designer actions into workflow steps."
        ]
      : [
          `Open Connectors, choose ${connector.appName}, and enter a clear display name.`,
          `Add the required ${connector.authType.replace("_", " ")} credential values.`,
          "Save the connection, then run the live connection test before using it in workflows.",
          "Use the API action catalog to map request fields and data pills into workflow steps."
        ],
  requiredCredentials: connector.credentialFields.map((field) => ({
    key: field.key,
    description: field.placeholder ?? field.label,
    required: field.required
  })),
  scopes: connector.requiredScopes,
  serviceNowSetup: {
    dynamicTables: [
      "Use the ServiceNow Table API pattern /api/now/table/{table_name} for standard or custom tables.",
      "For custom tables, confirm the table name starts with the expected app scope prefix such as x_scope_table.",
      "Map FlowConnect data pills to ServiceNow field names, then test with sysparm_limit=1 before writes."
    ],
    workflowOptions: [
      "For Flow Designer or Scripted REST integrations, expose a stable endpoint that can be called from a REST API workflow step.",
      "Use a ServiceNow service account with table ACL access and only the required create/update/read permissions.",
      "For external API integrations, use OAuth client credentials by posting grant_type=client_credentials, client_id, and client_secret to /oauth_token.do."
    ],
    tableApiSteps: [
      "Identify the target table and required fields in ServiceNow.",
      "Add a connector action using the dynamic table record endpoint.",
      "Map request body fields from FlowConnect trigger or transform outputs.",
      "Test with a non-production record first and inspect the returned sys_id."
    ]
  },
  customAppSetup: {
    apiRequirements: [
      "Provide a stable base URL, auth method, test endpoint, and JSON request/response examples.",
      "Document rate limits, retryable errors, pagination, and idempotency keys for write operations."
    ],
    openApiCatalogSteps: [
      "Paste or summarize the OpenAPI endpoint list into the AI prompt.",
      "Ask AI to convert endpoints into FlowConnect actions with method, path, required fields, and output fields.",
      "Review generated actions before publishing workflows."
    ],
    authOptions: ["Bearer token", "API key", "Basic auth", "OAuth 2.0 with refresh token"]
  },
  workflowPlan: [
    "Create or load a workflow draft.",
    "Choose the saved connection on a connector action step.",
    "Map incoming data with data pills and dot-walking.",
    "Publish the workflow, then activate it after validation passes."
  ],
  testingChecklist: [
    "Save the connection.",
    "Run a connection test.",
    "Create a workflow draft with a safe test payload.",
    "Check workflow run status for in progress, complete, error, or cancelled."
  ],
  securityNotes: [
    "Use a dedicated service account instead of a personal account.",
    "Avoid storing secrets in prompts, README files, workflow names, or field labels.",
    "Rotate credentials and disable unused connections."
  ]
});

const coerceGuide = (value: unknown, connector: ConnectorDefinition, prompt: string): ConnectionGuide => {
  const guide = value as Partial<ConnectionGuide>;
  const fallback = fallbackGuide(connector, prompt);

  return {
    title: guide.title ?? fallback.title,
    summary: guide.summary ?? fallback.summary,
    userAccountSetup: Array.isArray(guide.userAccountSetup) ? guide.userAccountSetup.map(String) : fallback.userAccountSetup,
    connectionSteps: Array.isArray(guide.connectionSteps) ? guide.connectionSteps.map(String) : fallback.connectionSteps,
    requiredCredentials: Array.isArray(guide.requiredCredentials) ? guide.requiredCredentials : fallback.requiredCredentials,
    scopes: Array.isArray(guide.scopes) ? guide.scopes.map(String) : fallback.scopes,
    serviceNowSetup: guide.serviceNowSetup ?? fallback.serviceNowSetup,
    customAppSetup: guide.customAppSetup ?? fallback.customAppSetup,
    workflowPlan: Array.isArray(guide.workflowPlan) ? guide.workflowPlan.map(String) : fallback.workflowPlan,
    testingChecklist: Array.isArray(guide.testingChecklist) ? guide.testingChecklist.map(String) : fallback.testingChecklist,
    securityNotes: Array.isArray(guide.securityNotes) ? guide.securityNotes.map(String) : fallback.securityNotes
  };
};

export const createAIConnectionGuide = async ({
  connectorId,
  prompt
}: {
  connectorId: string;
  prompt: string;
}) => {
  const connector = findConnector(connectorId);

  if (!connector) {
    throw new Error("Connector not found.");
  }

  if (!hasOpenAIConfig()) {
    return fallbackGuide(connector, prompt);
  }

  const config = getOpenAIConfig();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      input: [
        {
          role: "system",
          content:
            "Create FlowConnect connection setup guides. Return only JSON. Include user account setup, connection steps, custom application setup, ServiceNow dynamic table and workflow setup, security notes, and workflow activation guidance. Never request or include secret values."
        },
        {
          role: "user",
          content: JSON.stringify({
            userPrompt: prompt,
            connector: {
              id: connector.id,
              appName: connector.appName,
              authType: connector.authType,
              requiredScopes: connector.requiredScopes,
              credentialFields: connector.credentialFields,
              actionCatalog: connector.actionCatalog,
              authDocsUrl: connector.authDocsUrl,
              apiDocsUrl: connector.apiDocsUrl
            },
            requiredShape: {
              title: "string",
              summary: "string",
              userAccountSetup: ["string"],
              connectionSteps: ["string"],
              requiredCredentials: [{ key: "string", description: "string", required: true }],
              scopes: ["string"],
              serviceNowSetup: {
                dynamicTables: ["string"],
                workflowOptions: ["string"],
                tableApiSteps: ["string"]
              },
              customAppSetup: {
                apiRequirements: ["string"],
                openApiCatalogSteps: ["string"],
                authOptions: ["string"]
              },
              workflowPlan: ["string"],
              testingChecklist: ["string"],
              securityNotes: ["string"]
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
    throw new Error(`OpenAI connection guide request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };
  const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text;

  if (!text) {
    throw new Error("OpenAI returned an empty connection guide.");
  }

  return coerceGuide(JSON.parse(text) as unknown, connector, prompt);
};
