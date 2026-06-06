import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { encryptCredentials } from "@/lib/connection-secrets";
import { getConnector } from "@/lib/connector-sdk";
import { db } from "@/lib/db";
import type { StoredConnection } from "@/lib/connector-runtime";

type ConnectionRow = RowDataPacket & {
  id: number;
  user_id: number;
  connection_type_id: string;
  display_name: string;
  encrypted_credentials: string;
  scopes: string | string[];
  status: StoredConnection["status"];
  health_status: StoredConnection["healthStatus"];
  last_checked_at: Date | null;
};

const parseJsonArray = (value: string | string[]) => {
  if (Array.isArray(value)) {
    return value;
  }

  return JSON.parse(value) as string[];
};

const mapConnection = (row: ConnectionRow): StoredConnection => ({
  id: row.id,
  userId: row.user_id,
  connectorId: row.connection_type_id,
  displayName: row.display_name,
  encryptedCredentials: row.encrypted_credentials,
  scopes: parseJsonArray(row.scopes),
  status: row.status,
  healthStatus: row.health_status,
  lastCheckedAt: row.last_checked_at?.toISOString()
});

export const listConnectionsForUser = async (userId: number) => {
  const [rows] = await db().execute<ConnectionRow[]>(
    `SELECT id, user_id, connection_type_id, display_name, encrypted_credentials, scopes, status, health_status, last_checked_at
     FROM connections
     WHERE user_id = :userId
     ORDER BY updated_at DESC`,
    { userId }
  );

  return rows.map(mapConnection);
};

export const getConnectionForUser = async (connectionId: number, userId: number) => {
  const [rows] = await db().execute<ConnectionRow[]>(
    `SELECT id, user_id, connection_type_id, display_name, encrypted_credentials, scopes, status, health_status, last_checked_at
     FROM connections
     WHERE id = :connectionId AND user_id = :userId
     LIMIT 1`,
    { connectionId, userId }
  );

  return rows[0] ? mapConnection(rows[0]) : null;
};

export const createConnectionForUser = async ({
  userId,
  connectorId,
  displayName,
  credentials
}: {
  userId: number;
  connectorId: string;
  displayName: string;
  credentials: Record<string, string>;
}) => {
  const connector = getConnector(connectorId);

  if (!connector) {
    throw new Error(`Connector ${connectorId} is not registered.`);
  }

  const missingFields = connector.credentialFields
    .filter((field) => field.required && !credentials[field.key])
    .map((field) => field.label);

  if (missingFields.length > 0) {
    throw new Error(`Missing required credentials: ${missingFields.join(", ")}.`);
  }

  const encryptedCredentials = encryptCredentials(credentials);
  const [result] = await db().execute<ResultSetHeader>(
    `INSERT INTO connections
      (user_id, connection_type_id, display_name, encrypted_credentials, scopes, status, health_status)
     VALUES
      (:userId, :connectorId, :displayName, :encryptedCredentials, :scopes, 'enabled', 'unknown')`,
    {
      userId,
      connectorId,
      displayName: displayName || connector.appName,
      encryptedCredentials,
      scopes: JSON.stringify(connector.requiredScopes)
    }
  );

  return getConnectionForUser(result.insertId, userId);
};

export const updateConnectionHealth = async (
  connectionId: number,
  userId: number,
  healthStatus: StoredConnection["healthStatus"]
) => {
  await db().execute(
    `UPDATE connections
     SET health_status = :healthStatus,
         status = IF(:healthStatus = 'healthy', 'enabled', 'error'),
         last_checked_at = NOW()
     WHERE id = :connectionId AND user_id = :userId`,
    { connectionId, userId, healthStatus }
  );
};

export const toSafeConnection = (connection: StoredConnection) => ({
  id: connection.id,
  userId: connection.userId,
  connectorId: connection.connectorId,
  displayName: connection.displayName,
  scopes: connection.scopes,
  status: connection.status,
  healthStatus: connection.healthStatus,
  lastCheckedAt: connection.lastCheckedAt
});
