export type ConnectorCategory =
  | "ITSM"
  | "Developer"
  | "Google"
  | "Video"
  | "Website"
  | "Social"
  | "Generic";

export type AuthType = "oauth2" | "api_key" | "basic" | "bearer_token";

export type CredentialField = {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  required: boolean;
  placeholder?: string;
};

export type ConnectorApiAction = {
  key: string;
  label: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint: string;
  docsUrl: string;
  requiredScopes: string[];
};

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
  brandColor: string;
  category: ConnectorCategory;
  authType: AuthType;
  authDocsUrl: string;
  apiDocsUrl: string;
  requiredScopes: string[];
  credentialFields: CredentialField[];
  availableTriggers: string[];
  availableActions: string[];
  actionCatalog: ConnectorApiAction[];
  rateLimitRules: RateLimitRule[];
  errorHandlingRules: ErrorHandlingRule;
  testConnection: (context: ConnectorContext) => Promise<ConnectionTestResult>;
  refreshToken: (context: ConnectorContext) => Promise<RefreshTokenResult>;
};

const now = () => new Date().toISOString();

const bearerHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/json"
});

const normalizeInstanceUrl = (value?: string) => value?.replace(/\/+$/, "");

const httpConnectionTest = async (
  appName: string,
  request: RequestInfo | URL,
  init?: RequestInit
): Promise<ConnectionTestResult> => {
  try {
    const response = await fetch(request, init);

    return {
      ok: response.ok,
      message: response.ok
        ? `${appName} connection verified.`
        : `${appName} returned ${response.status} ${response.statusText}.`,
      checkedAt: now()
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : `${appName} connection failed.`,
      checkedAt: now()
    };
  }
};

const refreshOAuthToken = async (connector: Pick<ConnectorDefinition, "appName" | "id">, context: ConnectorContext) => {
  const { refreshToken, clientId, clientSecret, tokenUrl } = context.credentials;

  if (!refreshToken || !clientId || !clientSecret || !tokenUrl) {
    throw new Error(`${connector.appName} token refresh requires refreshToken, clientId, clientSecret, and tokenUrl.`);
  }

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    })
  });

  if (!response.ok) {
    throw new Error(`${connector.appName} token refresh failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? refreshToken,
    expiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : undefined
  };
};

const oauthFields: CredentialField[] = [
  { key: "accessToken", label: "Access token", type: "password", required: true },
  { key: "refreshToken", label: "Refresh token", type: "password", required: false },
  { key: "clientId", label: "Client ID", type: "password", required: false },
  { key: "clientSecret", label: "Client secret", type: "password", required: false },
  { key: "tokenUrl", label: "Token URL", type: "url", required: false }
];

export const connectorRegistry: ConnectorDefinition[] = [
  {
    id: "servicenow",
    appName: "ServiceNow",
    appIcon: "SN",
    brandColor: "#81b5a1",
    category: "ITSM",
    authType: "bearer_token",
    authDocsUrl: "https://www.servicenow.com/docs/bundle/xanadu-platform-security/page/administer/security/concept/oauth-setup.html",
    apiDocsUrl: "https://www.servicenow.com/docs/bundle/xanadu-api-reference/page/integrate/inbound-rest/concept/c_TableAPI.html",
    requiredScopes: ["incident.write", "case.write", "user.read", "table.write", "flow.execute"],
    credentialFields: [
      { key: "instanceUrl", label: "Instance URL", type: "url", required: true, placeholder: "https://example.service-now.com" },
      { key: "accessToken", label: "Access token", type: "password", required: true }
    ],
    availableTriggers: ["Incident Created", "Incident Updated", "Case Updated"],
    availableActions: [
      "Create Incident",
      "Update Incident",
      "Create Case",
      "Add Work Note",
      "Create Dynamic Table Record",
      "Update Dynamic Table Record",
      "Execute Flow Designer Action"
    ],
    actionCatalog: [
      {
        key: "createIncident",
        label: "Create incident",
        method: "POST",
        endpoint: "/api/now/table/incident",
        docsUrl: "https://www.servicenow.com/docs/r/qnibzcgwHHd8lRjqRYIU3g/lJdwmUq4r7Mm~Pr9vcskdA",
        requiredScopes: ["incident.write"]
      },
      {
        key: "createDynamicTableRecord",
        label: "Create dynamic table record",
        method: "POST",
        endpoint: "/api/now/table/{tableName}",
        docsUrl: "https://www.servicenow.com/docs/bundle/xanadu-api-reference/page/integrate/inbound-rest/concept/c_TableAPI.html",
        requiredScopes: ["table.write"]
      },
      {
        key: "updateDynamicTableRecord",
        label: "Update dynamic table record",
        method: "PATCH",
        endpoint: "/api/now/table/{tableName}/{sysId}",
        docsUrl: "https://www.servicenow.com/docs/bundle/xanadu-api-reference/page/integrate/inbound-rest/concept/c_TableAPI.html",
        requiredScopes: ["table.write"]
      },
      {
        key: "executeFlowDesignerAction",
        label: "Execute Flow Designer action",
        method: "POST",
        endpoint: "/api/now/v1/action/{actionName}",
        docsUrl: "https://www.servicenow.com/docs/bundle/xanadu-api-reference/page/integrate/inbound-rest/concept/c_API.html",
        requiredScopes: ["flow.execute"]
      }
    ],
    rateLimitRules: [{ window: "minute", maxRequests: 120, strategy: "queue" }],
    errorHandlingRules: {
      retryableStatuses: [429, 500, 502, 503, 504],
      maxRetries: 4,
      backoff: "exponential",
      fallbackAction: "send_to_dead_letter"
    },
    testConnection: (context) => {
      const instanceUrl = normalizeInstanceUrl(context.credentials.instanceUrl);

      if (!instanceUrl || !context.credentials.accessToken) {
        return Promise.resolve({ ok: false, message: "ServiceNow requires instance URL and access token.", checkedAt: now() });
      }

      return httpConnectionTest("ServiceNow", `${instanceUrl}/api/now/table/sys_user?sysparm_limit=1`, {
        headers: bearerHeaders(context.credentials.accessToken)
      });
    },
    refreshToken: (context) => refreshOAuthToken({ appName: "ServiceNow", id: "servicenow" }, context)
  },
  {
    id: "github",
    appName: "GitHub",
    appIcon: "GH",
    brandColor: "#24292f",
    category: "Developer",
    authType: "bearer_token",
    authDocsUrl: "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps",
    apiDocsUrl: "https://docs.github.com/en/rest",
    requiredScopes: ["repo", "read:user", "issues:write"],
    credentialFields: [{ key: "accessToken", label: "Personal access token", type: "password", required: true }],
    availableTriggers: ["Issue Opened", "Issue Labeled", "Pull Request Ready"],
    availableActions: ["Create Issue", "Add Comment", "Apply Label", "Dispatch Workflow"],
    actionCatalog: [
      {
        key: "createIssue",
        label: "Create issue",
        method: "POST",
        endpoint: "/repos/{owner}/{repo}/issues",
        docsUrl: "https://docs.github.com/en/rest/issues/issues#create-an-issue",
        requiredScopes: ["issues:write"]
      },
      {
        key: "addIssueComment",
        label: "Add issue comment",
        method: "POST",
        endpoint: "/repos/{owner}/{repo}/issues/{issue_number}/comments",
        docsUrl: "https://docs.github.com/en/rest/issues/comments#create-an-issue-comment",
        requiredScopes: ["issues:write"]
      }
    ],
    rateLimitRules: [{ window: "hour", maxRequests: 5000, strategy: "throttle" }],
    errorHandlingRules: {
      retryableStatuses: [403, 429, 500, 502, 503, 504],
      maxRetries: 3,
      backoff: "exponential",
      fallbackAction: "mark_failed"
    },
    testConnection: (context) =>
      context.credentials.accessToken
        ? httpConnectionTest("GitHub", "https://api.github.com/user", { headers: bearerHeaders(context.credentials.accessToken) })
        : Promise.resolve({ ok: false, message: "GitHub requires an access token.", checkedAt: now() }),
    refreshToken: (context) => refreshOAuthToken({ appName: "GitHub", id: "github" }, context)
  },
  {
    id: "google-sheets",
    appName: "Google Sheets",
    appIcon: "G",
    brandColor: "#0f9d58",
    category: "Google",
    authType: "oauth2",
    authDocsUrl: "https://developers.google.com/identity/protocols/oauth2/web-server",
    apiDocsUrl: "https://developers.google.com/workspace/sheets/api/reference/rest",
    requiredScopes: ["https://www.googleapis.com/auth/spreadsheets"],
    credentialFields: oauthFields,
    availableTriggers: ["New Row", "Updated Row"],
    availableActions: ["Append Row", "Update Row", "Find Row", "Create Sheet"],
    actionCatalog: [
      {
        key: "appendRow",
        label: "Append row",
        method: "POST",
        endpoint: "/v4/spreadsheets/{spreadsheetId}/values/{range}:append",
        docsUrl: "https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append",
        requiredScopes: ["https://www.googleapis.com/auth/spreadsheets"]
      }
    ],
    rateLimitRules: [{ window: "minute", maxRequests: 300, strategy: "queue" }],
    errorHandlingRules: {
      retryableStatuses: [429, 500, 502, 503],
      maxRetries: 5,
      backoff: "exponential",
      fallbackAction: "send_to_dead_letter"
    },
    testConnection: (context) =>
      context.credentials.accessToken
        ? httpConnectionTest("Google", "https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: bearerHeaders(context.credentials.accessToken)
          })
        : Promise.resolve({ ok: false, message: "Google Sheets requires an access token.", checkedAt: now() }),
    refreshToken: (context) => refreshOAuthToken({ appName: "Google Sheets", id: "google-sheets" }, context)
  },
  {
    id: "youtube",
    appName: "YouTube",
    appIcon: "YT",
    brandColor: "#ff0000",
    category: "Video",
    authType: "oauth2",
    authDocsUrl: "https://developers.google.com/identity/protocols/oauth2/web-server",
    apiDocsUrl: "https://developers.google.com/youtube/v3/docs",
    requiredScopes: ["https://www.googleapis.com/auth/youtube.readonly"],
    credentialFields: oauthFields,
    availableTriggers: ["Video Uploaded", "Comment Added", "Channel Updated"],
    availableActions: ["Get Video", "List Channel Videos", "Fetch Captions"],
    actionCatalog: [
      {
        key: "listVideos",
        label: "List videos",
        method: "GET",
        endpoint: "/youtube/v3/videos",
        docsUrl: "https://developers.google.com/youtube/v3/docs/videos/list",
        requiredScopes: ["https://www.googleapis.com/auth/youtube.readonly"]
      }
    ],
    rateLimitRules: [{ window: "day", maxRequests: 10000, strategy: "throttle" }],
    errorHandlingRules: {
      retryableStatuses: [403, 429, 500, 503],
      maxRetries: 3,
      backoff: "fixed",
      fallbackAction: "skip_step"
    },
    testConnection: (context) =>
      context.credentials.accessToken
        ? httpConnectionTest("YouTube", "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true", {
            headers: bearerHeaders(context.credentials.accessToken)
          })
        : Promise.resolve({ ok: false, message: "YouTube requires an access token.", checkedAt: now() }),
    refreshToken: (context) => refreshOAuthToken({ appName: "YouTube", id: "youtube" }, context)
  },
  {
    id: "wix",
    appName: "Wix",
    appIcon: "W",
    brandColor: "#116dff",
    category: "Website",
    authType: "oauth2",
    authDocsUrl: "https://dev.wix.com/docs/build-apps/develop-your-app/api-integrations/rest",
    apiDocsUrl: "https://dev.wix.com/docs/api-reference",
    requiredScopes: ["forms.read", "contacts.write", "sites.read"],
    credentialFields: oauthFields,
    availableTriggers: ["Form Submitted", "Contact Created", "Order Created"],
    availableActions: ["Create Contact", "Update Contact", "Get Form Submission"],
    actionCatalog: [
      {
        key: "createSubmission",
        label: "Create form submission",
        method: "POST",
        endpoint: "/form-submission-service/v4/submissions",
        docsUrl: "https://dev.wix.com/docs/api-reference/crm/forms/form-submissions/create-submission",
        requiredScopes: ["forms.read"]
      }
    ],
    rateLimitRules: [{ window: "minute", maxRequests: 200, strategy: "queue" }],
    errorHandlingRules: {
      retryableStatuses: [408, 429, 500, 502, 503, 504],
      maxRetries: 4,
      backoff: "exponential",
      fallbackAction: "mark_failed"
    },
    testConnection: (context) =>
      context.credentials.accessToken
        ? httpConnectionTest("Wix", "https://www.wixapis.com/site-list/v2/sites", {
            headers: bearerHeaders(context.credentials.accessToken)
          })
        : Promise.resolve({ ok: false, message: "Wix requires an access token.", checkedAt: now() }),
    refreshToken: (context) => refreshOAuthToken({ appName: "Wix", id: "wix" }, context)
  },
  {
    id: "instagram",
    appName: "Instagram",
    appIcon: "IG",
    brandColor: "#e4405f",
    category: "Social",
    authType: "oauth2",
    authDocsUrl: "https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/",
    apiDocsUrl: "https://developers.facebook.com/docs/instagram-platform/reference",
    requiredScopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
    credentialFields: oauthFields,
    availableTriggers: ["Media Published", "Comment Added"],
    availableActions: ["Create Media Container", "Publish Media", "Reply To Comment"],
    actionCatalog: [
      {
        key: "createMediaContainer",
        label: "Create media container",
        method: "POST",
        endpoint: "/{ig-user-id}/media",
        docsUrl: "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media",
        requiredScopes: ["instagram_content_publish"]
      }
    ],
    rateLimitRules: [{ window: "hour", maxRequests: 200, strategy: "throttle" }],
    errorHandlingRules: {
      retryableStatuses: [4, 17, 32, 613],
      maxRetries: 3,
      backoff: "exponential",
      fallbackAction: "mark_failed"
    },
    testConnection: (context) =>
      context.credentials.accessToken
        ? httpConnectionTest("Instagram", "https://graph.facebook.com/v20.0/me?fields=id,name", {
            headers: bearerHeaders(context.credentials.accessToken)
          })
        : Promise.resolve({ ok: false, message: "Instagram requires an access token.", checkedAt: now() }),
    refreshToken: (context) => refreshOAuthToken({ appName: "Instagram", id: "instagram" }, context)
  },
  {
    id: "custom-app",
    appName: "Custom App",
    appIcon: "API",
    brandColor: "#475569",
    category: "Generic",
    authType: "bearer_token",
    authDocsUrl: "https://swagger.io/specification/",
    apiDocsUrl: "https://swagger.io/specification/",
    requiredScopes: ["api.read", "api.write"],
    credentialFields: [
      { key: "baseUrl", label: "Base API URL", type: "url", required: true, placeholder: "https://api.example.com" },
      { key: "accessToken", label: "Bearer token", type: "password", required: true },
      { key: "testPath", label: "Test path", type: "text", required: false, placeholder: "/health" }
    ],
    availableTriggers: ["Webhook Received", "Polling Event", "Async API Request"],
    availableActions: ["Call REST Endpoint", "Create Record", "Update Record", "Run Operation"],
    actionCatalog: [
      {
        key: "callRestEndpoint",
        label: "Call REST endpoint",
        method: "POST",
        endpoint: "{baseUrl}/{path}",
        docsUrl: "https://swagger.io/specification/",
        requiredScopes: ["api.write"]
      },
      {
        key: "getResource",
        label: "Get resource",
        method: "GET",
        endpoint: "{baseUrl}/{resourcePath}",
        docsUrl: "https://swagger.io/specification/",
        requiredScopes: ["api.read"]
      }
    ],
    rateLimitRules: [{ window: "minute", maxRequests: 120, strategy: "queue" }],
    errorHandlingRules: {
      retryableStatuses: [408, 429, 500, 502, 503, 504],
      maxRetries: 3,
      backoff: "exponential",
      fallbackAction: "mark_failed"
    },
    testConnection: (context) => {
      const baseUrl = normalizeInstanceUrl(context.credentials.baseUrl);
      const testPath = context.credentials.testPath?.startsWith("/") ? context.credentials.testPath : `/${context.credentials.testPath ?? ""}`;

      if (!baseUrl || !context.credentials.accessToken) {
        return Promise.resolve({ ok: false, message: "Custom App requires base API URL and bearer token.", checkedAt: now() });
      }

      return httpConnectionTest("Custom App", `${baseUrl}${testPath === "/" ? "" : testPath}`, {
        headers: bearerHeaders(context.credentials.accessToken)
      });
    },
    refreshToken: (context) =>
      Promise.resolve({
        accessToken: context.credentials.accessToken,
        expiresAt: undefined
      })
  }
];

export const getConnector = (id: string) => connectorRegistry.find((connector) => connector.id === id);
