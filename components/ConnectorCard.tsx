import type { ConnectorDefinition } from "@/lib/connector-sdk";
import { BrandIcon } from "@/components/BrandIcon";

export function ConnectorCard({ connector }: { connector: ConnectorDefinition }) {
  return (
    <article className="card connector-card">
      <div className="connector-card-header">
        <BrandIcon connector={connector} size="lg" />
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
      <div className="button-row">
        <a className="button" href={connector.authDocsUrl} target="_blank" rel="noreferrer">
          Auth docs
        </a>
        <a className="button" href={connector.apiDocsUrl} target="_blank" rel="noreferrer">
          API docs
        </a>
      </div>
      <div className="action-catalog">
        <strong>API action catalog</strong>
        {connector.actionCatalog.map((action) => (
          <a href={action.docsUrl} key={action.key} target="_blank" rel="noreferrer">
            <span>{action.method}</span>
            {action.label}
          </a>
        ))}
      </div>
    </article>
  );
}
