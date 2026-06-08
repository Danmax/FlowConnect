"use client";

import { useState } from "react";
import type { ConnectionGuide } from "@/lib/ai-connection-guide";
import type { ConnectorDefinition } from "@/lib/connector-sdk";

type ClientConnector = Omit<ConnectorDefinition, "testConnection" | "refreshToken">;

const renderList = (items: string[]) => (
  <ol>
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ol>
);

export function ConnectionSetupAssistant({ connectors }: { connectors: ClientConnector[] }) {
  const [connectorId, setConnectorId] = useState("servicenow");
  const [prompt, setPrompt] = useState(
    "Set up ServiceNow dynamic table actions for incidents, custom scoped tables, and Flow Designer workflow execution."
  );
  const [guide, setGuide] = useState<ConnectionGuide | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateGuide = async () => {
    setLoading(true);
    setMessage("Generating connection setup guide...");

    const response = await fetch("/api/ai/connection-guides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectorId, prompt })
    });
    const payload = (await response.json().catch(() => ({}))) as {
      guide?: ConnectionGuide;
      error?: string;
    };

    setLoading(false);

    if (!response.ok || !payload.guide) {
      setMessage(payload.error ?? "Connection setup guide could not be generated.");
      return;
    }

    setGuide(payload.guide);
    setMessage("Connection setup guide ready.");
  };

  const copyGuide = () => {
    if (!guide) {
      return;
    }

    navigator.clipboard?.writeText(JSON.stringify(guide, null, 2));
    setMessage("Guide copied.");
  };

  return (
    <section className="panel ai-proposal-panel">
      <div>
        <span className="badge">AI connection setup</span>
        <h2>Generate account setup and custom app connection steps</h2>
        <p className="muted">
          Ask AI for ServiceNow dynamic table mappings, Flow Designer workflow calls, custom REST app setup, scopes,
          credentials, testing, and workflow activation steps.
        </p>
      </div>
      <div className="grid two">
        <label>
          <span>Connection target</span>
          <select value={connectorId} onChange={(event) => setConnectorId(event.target.value)}>
            {connectors.map((connector) => (
              <option key={connector.id} value={connector.id}>
                {connector.appName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Prompt</span>
          <textarea
            rows={4}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: Connect a custom app with bearer auth, import OpenAPI actions, and map records into ServiceNow x_acme_request."
          />
        </label>
      </div>
      <button className="button primary big-button" disabled={loading || !prompt.trim()} onClick={generateGuide} type="button">
        {loading ? "Generating..." : "Generate setup guide"}
      </button>

      {guide ? (
        <div className="connection-guide">
          <div className="section-heading">
            <div>
              <h3>{guide.title}</h3>
              <p className="muted">{guide.summary}</p>
            </div>
            <button className="button" onClick={copyGuide} type="button">
              Copy JSON
            </button>
          </div>
          <div className="grid two">
            <article className="card">
              <h4>User account setup</h4>
              {renderList(guide.userAccountSetup)}
            </article>
            <article className="card">
              <h4>Connection steps</h4>
              {renderList(guide.connectionSteps)}
            </article>
            <article className="card">
              <h4>Required credentials</h4>
              <ul>
                {guide.requiredCredentials.map((credential) => (
                  <li key={credential.key}>
                    <strong>{credential.key}</strong>: {credential.description} {credential.required ? "(required)" : "(optional)"}
                  </li>
                ))}
              </ul>
            </article>
            <article className="card">
              <h4>Scopes</h4>
              {guide.scopes.length > 0 ? renderList(guide.scopes) : <p className="muted">No scopes listed.</p>}
            </article>
            <article className="card">
              <h4>ServiceNow dynamic tables</h4>
              {renderList(guide.serviceNowSetup.dynamicTables)}
            </article>
            <article className="card">
              <h4>ServiceNow workflows</h4>
              {renderList(guide.serviceNowSetup.workflowOptions)}
            </article>
            <article className="card">
              <h4>Custom application setup</h4>
              {renderList(guide.customAppSetup.apiRequirements)}
            </article>
            <article className="card">
              <h4>Workflow plan</h4>
              {renderList(guide.workflowPlan)}
            </article>
          </div>
          <article className="card">
            <h4>Testing and security</h4>
            <div className="grid two">
              <div>{renderList(guide.testingChecklist)}</div>
              <div>{renderList(guide.securityNotes)}</div>
            </div>
          </article>
        </div>
      ) : null}

      {message ? <p className={message.includes("could not") ? "form-error" : "form-success"}>{message}</p> : null}
    </section>
  );
}
