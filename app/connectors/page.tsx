import { AppShell } from "@/components/AppShell";
import { ConnectorCard } from "@/components/ConnectorCard";
import { connectorRegistry } from "@/lib/connector-sdk";

export default function ConnectorsPage() {
  return (
    <AppShell>
      <section>
        <span className="badge">Connector SDK</span>
        <h1>Modular app connectors</h1>
        <p className="lead">
          Each connector declares app metadata, auth, scopes, triggers, actions, connection tests, refresh behavior, rate
          limits, and error handling rules.
        </p>
      </section>
      <section className="grid two">
        {connectorRegistry.map((connector) => (
          <ConnectorCard connector={connector} key={connector.id} />
        ))}
      </section>
    </AppShell>
  );
}
