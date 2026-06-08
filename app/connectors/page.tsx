import { AppShell } from "@/components/AppShell";
import { ConnectorCard } from "@/components/ConnectorCard";
import { NewConnectionForm } from "@/components/NewConnectionForm";
import { connectorRegistry } from "@/lib/connector-sdk";
import { requireCurrentUser } from "@/lib/require-auth";

export default async function ConnectorsPage() {
  await requireCurrentUser();
  const clientConnectors = connectorRegistry.map(({ testConnection, refreshToken, ...connector }) => connector);

  return (
    <AppShell>
      <section>
        <span className="badge">Connector SDK</span>
        <h1>Modular app connectors</h1>
        <p className="lead">
          Add real user connections, save encrypted credentials, run live tests, and use the API action catalog to map
          workflow actions.
        </p>
      </section>
      <NewConnectionForm connectors={clientConnectors} />
      <section className="grid two">
        {connectorRegistry.map((connector) => (
          <ConnectorCard connector={connector} key={connector.id} />
        ))}
      </section>
    </AppShell>
  );
}
