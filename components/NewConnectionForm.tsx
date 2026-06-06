"use client";

import { useMemo, useState } from "react";
import type { ConnectorDefinition } from "@/lib/connector-sdk";
import { BrandIcon } from "@/components/BrandIcon";

type ClientConnector = Omit<ConnectorDefinition, "testConnection" | "refreshToken">;

type SaveState = {
  type: "idle" | "saving" | "saved" | "error";
  message?: string;
  connectionId?: number;
};

export function NewConnectionForm({ connectors }: { connectors: ClientConnector[] }) {
  const [selectedConnectorId, setSelectedConnectorId] = useState(connectors[0]?.id ?? "");
  const [saveState, setSaveState] = useState<SaveState>({ type: "idle" });
  const selectedConnector = useMemo(
    () => connectors.find((connector) => connector.id === selectedConnectorId),
    [connectors, selectedConnectorId]
  );

  const saveConnection = async (formData: FormData) => {
    if (!selectedConnector) {
      return;
    }

    setSaveState({ type: "saving", message: "Saving connection..." });

    const credentials = Object.fromEntries(
      selectedConnector.credentialFields.map((field) => [field.key, String(formData.get(field.key) ?? "")])
    );

    const response = await fetch("/api/connections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        connectorId: selectedConnector.id,
        displayName: String(formData.get("displayName") ?? selectedConnector.appName),
        credentials
      })
    });
    const payload = (await response.json()) as { connection?: { id: number }; error?: string };

    if (!response.ok || !payload.connection) {
      setSaveState({ type: "error", message: payload.error ?? "Connection could not be saved." });
      return;
    }

    setSaveState({
      type: "saved",
      message: "Connection saved. You can now run a live test.",
      connectionId: payload.connection.id
    });
  };

  const testConnection = async (formData: FormData) => {
    const connectionId = saveState.connectionId;

    if (!connectionId) {
      setSaveState({ type: "error", message: "Save the connection before testing." });
      return;
    }

    const response = await fetch(`/api/connections/${connectionId}/test`, {
      method: "POST"
    });
    const payload = (await response.json()) as { result?: { ok: boolean; message: string }; error?: string };

    setSaveState({
      type: response.ok && payload.result?.ok ? "saved" : "error",
      message: payload.result?.message ?? payload.error ?? "Connection test failed.",
      connectionId
    });
  };

  if (!selectedConnector) {
    return null;
  }

  return (
    <section className="panel connection-builder">
      <div>
        <span className="badge">Add connection</span>
        <h2>Choose an app</h2>
      </div>
      <div className="brand-button-grid">
        {connectors.map((connector) => (
          <button
            className={`brand-button ${connector.id === selectedConnector.id ? "brand-button-active" : ""}`}
            key={connector.id}
            onClick={() => setSelectedConnectorId(connector.id)}
            type="button"
          >
            <BrandIcon connector={connector} size="lg" />
            <span>{connector.appName}</span>
          </button>
        ))}
      </div>

      <form action={saveConnection} className="connection-form">
        <input name="displayName" placeholder={`${selectedConnector.appName} connection name`} />
        {selectedConnector.credentialFields.map((field) => (
          <label key={field.key}>
            <span>{field.label}</span>
            <input
              name={field.key}
              placeholder={field.placeholder}
              required={field.required}
              type={field.type === "password" ? "password" : field.type}
            />
          </label>
        ))}
        <button className="button primary big-button" type="submit">
          {saveState.type === "saving" ? "Saving..." : `Save ${selectedConnector.appName}`}
        </button>
      </form>

      <form action={testConnection}>
        <button className="button big-button" disabled={!saveState.connectionId} type="submit">
          Test saved connection
        </button>
      </form>

      {saveState.message ? <p className={saveState.type === "error" ? "form-error" : "form-success"}>{saveState.message}</p> : null}
    </section>
  );
}
