import { decryptCredentials } from "@/lib/connection-secrets";
import { getConnector, type ConnectorContext } from "@/lib/connector-sdk";

export type StoredConnection = {
  id: number;
  userId: number;
  connectorId: string;
  displayName: string;
  status: "enabled" | "disabled" | "error";
  encryptedCredentials: string;
  scopes: string[];
  healthStatus: "unknown" | "healthy" | "unhealthy";
  lastCheckedAt?: string;
};

export const createConnectorContext = async (connection: StoredConnection): Promise<ConnectorContext> => ({
  connectionId: String(connection.id),
  credentials: decryptCredentials(connection.encryptedCredentials),
  scopes: connection.scopes
});

export const testStoredConnection = async (connection: StoredConnection) => {
  const connector = getConnector(connection.connectorId);

  if (!connector) {
    return {
      ok: false,
      message: `Connector ${connection.connectorId} is not registered.`,
      checkedAt: new Date().toISOString()
    };
  }

  try {
    return await connector.testConnection(await createConnectorContext(connection));
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Connection test failed.",
      checkedAt: new Date().toISOString()
    };
  }
};

export const refreshStoredConnectionToken = async (connection: StoredConnection) => {
  const connector = getConnector(connection.connectorId);

  if (!connector) {
    throw new Error(`Connector ${connection.connectorId} is not registered.`);
  }

  return connector.refreshToken(await createConnectorContext(connection));
};
