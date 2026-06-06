import { getConnector, type ConnectorContext } from "@/lib/connector-sdk";

export type StoredConnection = {
  id: string;
  userId: string;
  connectorId: string;
  status: "enabled" | "disabled" | "error";
  encryptedCredentials: string;
  scopes: string[];
  healthStatus: "unknown" | "healthy" | "unhealthy";
  lastCheckedAt?: string;
};

export type ConnectionSecretProvider = {
  decrypt: (encryptedValue: string) => Promise<Record<string, string>>;
  encrypt: (value: Record<string, string>) => Promise<string>;
};

export const demoSecretProvider: ConnectionSecretProvider = {
  async decrypt(encryptedValue) {
    if (!encryptedValue) {
      return {};
    }

    try {
      return JSON.parse(Buffer.from(encryptedValue, "base64").toString("utf8")) as Record<string, string>;
    } catch {
      return {};
    }
  },
  async encrypt(value) {
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
  }
};

export const createConnectorContext = async (
  connection: StoredConnection,
  secrets: ConnectionSecretProvider = demoSecretProvider
): Promise<ConnectorContext> => ({
  connectionId: connection.id,
  credentials: await secrets.decrypt(connection.encryptedCredentials),
  scopes: connection.scopes
});

export const testStoredConnection = async (
  connection: StoredConnection,
  secrets: ConnectionSecretProvider = demoSecretProvider
) => {
  const connector = getConnector(connection.connectorId);

  if (!connector) {
    return {
      ok: false,
      message: `Connector ${connection.connectorId} is not registered.`,
      checkedAt: new Date().toISOString()
    };
  }

  return connector.testConnection(await createConnectorContext(connection, secrets));
};

export const refreshStoredConnectionToken = async (
  connection: StoredConnection,
  secrets: ConnectionSecretProvider = demoSecretProvider
) => {
  const connector = getConnector(connection.connectorId);

  if (!connector) {
    throw new Error(`Connector ${connection.connectorId} is not registered.`);
  }

  return connector.refreshToken(await createConnectorContext(connection, secrets));
};

export const demoConnectionFor = async (connectorId: string): Promise<StoredConnection> => ({
  id: `conn_${connectorId}`,
  userId: "demo-user",
  connectorId,
  status: "enabled",
  encryptedCredentials: await demoSecretProvider.encrypt({
    accessToken: `${connectorId}_demo_access_token`,
    refreshToken: `${connectorId}_demo_refresh_token`
  }),
  scopes: [],
  healthStatus: "unknown"
});
