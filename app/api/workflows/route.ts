import { NextRequest, NextResponse } from "next/server";
import { createWorkflowRunRecord, validateWorkflowForActivation, type WorkflowDraft } from "@/lib/workflow-engine";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Partial<WorkflowDraft> & {
    triggerData?: Record<string, unknown>;
  };
  const workflow: WorkflowDraft = {
    id: body.id ?? `workflow_${Date.now()}`,
    userId: body.userId ?? "demo-user",
    name: body.name ?? "Untitled workflow",
    status: body.status ?? "draft",
    steps: body.steps ?? []
  };
  const validation = validateWorkflowForActivation(workflow);
  const run = createWorkflowRunRecord(workflow, body.triggerData ?? {});

  return NextResponse.json(
    {
      message: "Workflow draft created. Persist this payload to MySQL and enqueue the run in BullMQ in production.",
      workflow,
      validation,
      run
    },
    { status: 201 }
  );
}
