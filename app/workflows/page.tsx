import { AppShell } from "@/components/AppShell";
import { WorkflowBuilder } from "@/components/workflows/WorkflowBuilder";
import { connectorRegistry } from "@/lib/connector-sdk";
import { requireCurrentUser } from "@/lib/require-auth";
import { listWorkflowsForUser } from "@/lib/workflow-repository";

export default async function WorkflowsPage() {
  const user = await requireCurrentUser();
  const connectors = connectorRegistry.map(({ testConnection, refreshToken, ...connector }) => connector);
  const workflows = await listWorkflowsForUser(user.id);

  return (
    <AppShell>
      <WorkflowBuilder connectors={connectors} initialWorkflows={workflows} />
    </AppShell>
  );
}
