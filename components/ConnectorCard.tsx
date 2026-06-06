import { CloudCog, Github, PanelsTopLeft, Sheet, Youtube } from "lucide-react";
import type { ConnectorDefinition } from "@/lib/connector-sdk";

const icons = {
  CloudCog,
  Github,
  PanelsTopLeft,
  Sheet,
  Youtube
};

export function ConnectorCard({ connector }: { connector: ConnectorDefinition }) {
  const Icon = icons[connector.appIcon as keyof typeof icons] ?? CloudCog;

  return (
    <article className="card">
      <div style={{ alignItems: "center", display: "flex", gap: 12, marginBottom: 14 }}>
        <span className="brand-mark">
          <Icon size={22} aria-hidden="true" />
        </span>
        <div>
          <h3>{connector.appName}</h3>
          <span className="badge">{connector.category}</span>
        </div>
      </div>
      <p className="muted">Auth: {connector.authType.toUpperCase()}</p>
      <p>
        <strong>Triggers:</strong> {connector.availableTriggers.join(", ")}
      </p>
      <p>
        <strong>Actions:</strong> {connector.availableActions.join(", ")}
      </p>
      <p className="muted">Scopes: {connector.requiredScopes.join(", ")}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <form action={`/api/connectors/${connector.id}/test`} method="post">
          <button className="button" type="submit">
            Test connection
          </button>
        </form>
        <form action={`/api/connectors/${connector.id}/refresh`} method="post">
          <button className="button" type="submit">
            Refresh token
          </button>
        </form>
      </div>
    </article>
  );
}
