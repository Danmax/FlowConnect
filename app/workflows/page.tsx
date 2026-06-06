import { AppShell } from "@/components/AppShell";
import { WorkflowBuilder } from "@/components/workflows/WorkflowBuilder";
import { getCurrentUser } from "@/lib/auth";
import { connectorRegistry } from "@/lib/connector-sdk";
import { listWorkflowsForUser } from "@/lib/workflow-repository";

export default async function WorkflowsPage() {
  const user = await getCurrentUser();
  const connectors = connectorRegistry.map(({ testConnection, refreshToken, ...connector }) => connector);
  const workflows = user ? await listWorkflowsForUser(user.id) : [];

  return (
    <AppShell>
      <WorkflowBuilder connectors={connectors} initialWorkflows={workflows} />
    </AppShell>
  );
}
