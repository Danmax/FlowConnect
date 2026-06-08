"use client";

import { useState } from "react";
import { BrandIcon } from "@/components/BrandIcon";
import type { ConnectorDefinition } from "@/lib/connector-sdk";
import type { StoredConnection } from "@/lib/connector-runtime";

type ClientConnector = Omit<ConnectorDefinition, "testConnection" | "refreshToken">;
type SafeConnection = Omit<StoredConnection, "encryptedCredentials">;
type ApiMapping = {
  connector: string;
  authType: string;
  requiredScopes: string[];
  actions: Array<{
    key: string;
    label: string;
    method: string;
    endpoint: string;
    docsUrl: string;
    requiredScopes: string[];
    inputBindings: {
      pathParams: Record<string, string>;
      body: string;
      outputFields: string[];
      dotWalkExamples: string[];
    };
  }>;
};

export function SavedConnectionsList({
  initialConnections,
  connectors
}: {
  initialConnections: SafeConnection[];
  connectors: ClientConnector[];
}) {
  const [connections, setConnections] = useState(initialConnections);
  const [message, setMessage] = useState<string | null>(null);
  const [mappingConnectionId, setMappingConnectionId] = useState<number | null>(null);
  const [mapping, setMapping] = useState<ApiMapping | null>(null);

  const refreshConnections = async () => {
    const response = await fetch("/api/connections");
    const payload = (await response.json().catch(() => ({}))) as { connections?: SafeConnection[]; error?: string };

    if (!response.ok || !payload.connections) {
      setMessage(payload.error ?? "Connections could not be refreshed.");
      return;
    }

    setConnections(payload.connections);
    setMessage("Connections refreshed.");
  };

  const testConnection = async (connectionId: number) => {
    setMessage("Testing connection...");
    const response = await fetch(`/api/connections/${connectionId}/test`, { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as {
      result?: { ok: boolean; message: string };
      error?: string;
      detail?: string;
    };

    await refreshConnections();
    setMessage(payload.result?.message ?? payload.detail ?? payload.error ?? "Connection test finished.");
  };

  const toggleConnection = async (connection: SafeConnection) => {
    const nextStatus = connection.status === "disabled" ? "enabled" : "disabled";
    setMessage(`Setting ${connection.displayName} to ${nextStatus}...`);

    const response = await fetch(`/api/connections/${connection.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    const payload = (await response.json().catch(() => ({}))) as { connection?: SafeConnection; error?: string };

    if (!response.ok || !payload.connection) {
      setMessage(payload.error ?? "Connection status could not be updated.");
      return;
    }

    setConnections((current) => current.map((item) => (item.id === payload.connection?.id ? (payload.connection as SafeConnection) : item)));
    setMessage(`Connection ${nextStatus}.`);
  };

  const runApiMapping = async (connection: SafeConnection) => {
    setMessage("Running API mapping...");
    const response = await fetch(`/api/connections/${connection.id}/mapping`, { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as { mapping?: ApiMapping; error?: string };

    if (!response.ok || !payload.mapping) {
      setMessage(payload.error ?? "API mapping could not be created.");
      return;
    }

    setMappingConnectionId(connection.id);
    setMapping(payload.mapping);
    setMessage("API mapping ready.");
  };

  return (
    <section className="panel saved-connections">
      <div className="section-heading">
        <div>
          <span className="badge">Saved connections</span>
          <h2>Manage account connections</h2>
          <p className="muted">Toggle active status, test live credentials, and generate API mappings for workflow steps.</p>
        </div>
        <button className="button" onClick={refreshConnections} type="button">
          Refresh
        </button>
      </div>

      <div className="grid two">
        {connections.length > 0 ? (
          connections.map((connection) => {
            const connector = connectors.find((item) => item.id === connection.connectorId);

            return (
              <article className="card connection-card" key={connection.id}>
                <div className="connector-card-header">
                  {connector ? <BrandIcon connector={connector} size="lg" /> : null}
                  <div>
                    <h3>{connection.displayName}</h3>
                    <p className="muted">{connector?.appName ?? connection.connectorId}</p>
                  </div>
                </div>
                <div className="connection-meta">
                  <span className={`status-pill status-${connection.status}`}>{connection.status}</span>
                  <span className={`status-pill health-${connection.healthStatus}`}>{connection.healthStatus}</span>
                </div>
                <p className="muted">Last checked: {connection.lastCheckedAt ?? "Not tested yet"}</p>
                <div className="button-row">
                  <label className="toggle-label">
                    <input checked={connection.status !== "disabled"} onChange={() => toggleConnection(connection)} type="checkbox" />
                    Active
                  </label>
                  <button className="button" onClick={() => testConnection(connection.id)} type="button">
                    Test connection
                  </button>
                  <button className="button primary" onClick={() => runApiMapping(connection)} type="button">
                    Run API Mapping
                  </button>
                </div>
                {mappingConnectionId === connection.id && mapping ? (
                  <div className="api-mapping-result">
                    <strong>{mapping.connector} API mapping</strong>
                    {mapping.actions.map((action) => (
                      <article key={action.key}>
                        <span className="badge">{action.method}</span>
                        <h4>{action.label}</h4>
                        <code>{action.endpoint}</code>
                        <p className="muted">Outputs: {action.inputBindings.outputFields.join(", ")}</p>
                        <pre>{JSON.stringify(action.inputBindings, null, 2)}</pre>
                      </article>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <article className="card">
            <h3>No saved connections yet</h3>
            <p className="muted">Add and save a connection above, then refresh this list.</p>
          </article>
        )}
      </div>

      {message ? <p className={message.includes("could not") ? "form-error" : "form-success"}>{message}</p> : null}
    </section>
  );
}
