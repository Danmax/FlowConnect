export type ConnectorCategory =
  | "ITSM"
  | "Developer"
  | "Google"
  | "Video"
  | "Website"
  | "Social"
  | "Generic";

export type AuthType = "oauth2" | "api_key" | "basic" | "bearer_token";

export type RateLimitRule = {
  window: "second" | "minute" | "hour" | "day";
  maxRequests: number;
  strategy: "queue" | "throttle" | "fail_fast";
};

export type ErrorHandlingRule = {
  retryableStatuses: number[];
  maxRetries: number;
  backoff: "fixed" | "exponential";
  fallbackAction: "mark_failed" | "skip_step" | "send_to_dead_letter";
};

export type ConnectorContext = {
  connectionId: string;
  credentials: Record<string, string>;
  scopes: string[];
};

export type ConnectionTestResult = {
  ok: boolean;
  message: string;
  checkedAt: string;
};

export type RefreshTokenResult = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
};

export type ConnectorDefinition = {
  id: string;
  appName: string;
  appIcon: string;
  category: ConnectorCategory;
  authType: AuthType;
  requiredScopes: string[];
  availableTriggers: string[];
  availableActions: string[];
  rateLimitRules: RateLimitRule[];
  errorHandlingRules: ErrorHandlingRule;
  testConnection: (context: ConnectorContext) => Promise<ConnectionTestResult>;
  refreshToken: (context: ConnectorContext) => Promise<RefreshTokenResult>;
};

const now = () => new Date().toISOString();

const createStarterConnector = (
  connector: Omit<ConnectorDefinition, "testConnection" | "refreshToken">
): ConnectorDefinition => ({
  ...connector,
  async testConnection(context) {
    const hasCredential = Object.keys(context.credentials).length > 0;

    return {
      ok: hasCredential,
      message: hasCredential
        ? `${connector.appName} connection is ready for workflow execution.`
        : `${connector.appName} credentials are missing.`,
      checkedAt: now()
    };
  },
  async refreshToken(context) {
    return {
      accessToken: context.credentials.accessToken ?? `${connector.id}_starter_access_token`,
      refreshToken: context.credentials.refreshToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };
  }
});

export const connectorRegistry: ConnectorDefinition[] = [
  createStarterConnector({
    id: "servicenow",
    appName: "ServiceNow",
    appIcon: "CloudCog",
    category: "ITSM",
    authType: "oauth2",
    requiredScopes: ["incident.write", "case.write", "user.read"],
    availableTriggers: ["Incident Created", "Incident Updated", "Case Updated"],
    availableActions: ["Create Incident", "Update Incident", "Create Case", "Add Work Note"],
    rateLimitRules: [{ window: "minute", maxRequests: 120, strategy: "queue" }],
    errorHandlingRules: {
      retryableStatuses: [429, 500, 502, 503, 504],
      maxRetries: 4,
      backoff: "exponential",
      fallbackAction: "send_to_dead_letter"
    }
  }),
  createStarterConnector({
    id: "github",
    appName: "GitHub",
    appIcon: "Github",
    category: "Developer",
    authType: "oauth2",
    requiredScopes: ["repo", "read:user", "issues:write"],
    availableTriggers: ["Issue Opened", "Issue Labeled", "Pull Request Ready"],
    availableActions: ["Create Issue", "Add Comment", "Apply Label", "Dispatch Workflow"],
    rateLimitRules: [{ window: "hour", maxRequests: 5000, strategy: "throttle" }],
    errorHandlingRules: {
      retryableStatuses: [403, 429, 500, 502, 503, 504],
      maxRetries: 3,
      backoff: "exponential",
      fallbackAction: "mark_failed"
    }
  }),
  createStarterConnector({
    id: "google-sheets",
    appName: "Google Sheets",
    appIcon: "Sheet",
    category: "Google",
    authType: "oauth2",
    requiredScopes: ["https://www.googleapis.com/auth/spreadsheets"],
    availableTriggers: ["New Row", "Updated Row"],
    availableActions: ["Append Row", "Update Row", "Find Row", "Create Sheet"],
    rateLimitRules: [{ window: "minute", maxRequests: 300, strategy: "queue" }],
    errorHandlingRules: {
      retryableStatuses: [429, 500, 502, 503],
      maxRetries: 5,
      backoff: "exponential",
      fallbackAction: "send_to_dead_letter"
    }
  }),
  createStarterConnector({
    id: "youtube",
    appName: "YouTube",
    appIcon: "Youtube",
    category: "Video",
    authType: "oauth2",
    requiredScopes: ["https://www.googleapis.com/auth/youtube.readonly"],
    availableTriggers: ["Video Uploaded", "Comment Added", "Channel Updated"],
    availableActions: ["Get Video", "List Channel Videos", "Fetch Captions"],
    rateLimitRules: [{ window: "day", maxRequests: 10000, strategy: "throttle" }],
    errorHandlingRules: {
      retryableStatuses: [403, 429, 500, 503],
      maxRetries: 3,
      backoff: "fixed",
      fallbackAction: "skip_step"
    }
  }),
  createStarterConnector({
    id: "wix",
    appName: "Wix",
    appIcon: "PanelsTopLeft",
    category: "Website",
    authType: "oauth2",
    requiredScopes: ["forms.read", "contacts.write", "sites.read"],
    availableTriggers: ["Form Submitted", "Contact Created", "Order Created"],
    availableActions: ["Create Contact", "Update Contact", "Get Form Submission"],
    rateLimitRules: [{ window: "minute", maxRequests: 200, strategy: "queue" }],
    errorHandlingRules: {
      retryableStatuses: [408, 429, 500, 502, 503, 504],
      maxRetries: 4,
      backoff: "exponential",
      fallbackAction: "mark_failed"
    }
  })
];

export const getConnector = (id: string) => connectorRegistry.find((connector) => connector.id === id);
