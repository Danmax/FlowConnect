import { AppShell } from "@/components/AppShell";
import { WorkflowBuilder } from "@/components/workflows/WorkflowBuilder";
import { connectorRegistry } from "@/lib/connector-sdk";

export default function WorkflowsPage() {
  const connectors = connectorRegistry.map(({ testConnection, refreshToken, ...connector }) => connector);

  return (
    <AppShell>
      <WorkflowBuilder connectors={connectors} />
    </AppShell>
  );
}
