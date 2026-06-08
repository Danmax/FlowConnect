import { NextRequest, NextResponse } from "next/server";
import { getConnectionForUser } from "@/lib/connection-repository";
import { getConnector } from "@/lib/connector-sdk";
import { getRequestUserId } from "@/lib/request-user";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const inferBindingValue = (name: string) => {
  const normalized = name.toLowerCase();

  if (normalized.includes("table")) {
    return "{{config.tableName}}";
  }

  if (normalized.includes("sysid") || normalized.includes("id")) {
    return "{{trigger.record.sys_id}}";
  }

  if (normalized.includes("path")) {
    return "{{config.path}}";
  }

  return "{{trigger.payload}}";
};

const createActionMapping = (endpoint: string) => {
  const pathParams = Array.from(endpoint.matchAll(/\{([^}]+)\}/g)).map((match) => match[1]);

  return {
    pathParams: Object.fromEntries(pathParams.map((param) => [param, inferBindingValue(param)])),
    body: "{{trigger.payload}}",
    outputFields: ["result.id", "result.status", "result.raw"],
    dotWalkExamples: ["{{trigger.payload}}", "{{step_1.result.id}}", "{{step_1.result.raw}}"]
  };
};

export async function POST(request: NextRequest, context: RouteContext) {
  const userId = await getRequestUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
  }

  const { id } = await context.params;
  const connectionId = Number(id);

  if (!Number.isInteger(connectionId) || connectionId <= 0) {
    return NextResponse.json({ error: "Connection id must be numeric." }, { status: 400 });
  }

  const connection = await getConnectionForUser(connectionId, userId);

  if (!connection) {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }

  const connector = getConnector(connection.connectorId);

  if (!connector) {
    return NextResponse.json({ error: "Connector is not registered." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { actionKey?: string };
  const actions = body.actionKey
    ? connector.actionCatalog.filter((action) => action.key === body.actionKey)
    : connector.actionCatalog;

  if (actions.length === 0) {
    return NextResponse.json({ error: "No API actions matched the mapping request." }, { status: 404 });
  }

  return NextResponse.json({
    connection: {
      id: connection.id,
      displayName: connection.displayName,
      connectorId: connection.connectorId,
      status: connection.status,
      healthStatus: connection.healthStatus
    },
    mapping: {
      connector: connector.appName,
      authType: connector.authType,
      requiredScopes: connector.requiredScopes,
      actions: actions.map((action) => ({
        key: action.key,
        label: action.label,
        method: action.method,
        endpoint: action.endpoint,
        docsUrl: action.docsUrl,
        requiredScopes: action.requiredScopes,
        inputBindings: createActionMapping(action.endpoint)
      }))
    }
  });
}
