import { NextRequest, NextResponse } from "next/server";
import { createWorkflowRunRecord, validateWorkflowForActivation, type WorkflowDraft } from "@/lib/workflow-engine";
import { getRequestUserId } from "@/lib/request-user";

export async function POST(request: NextRequest) {
  const userId = getRequestUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<WorkflowDraft> & {
    triggerData?: Record<string, unknown>;
  };
  const workflow: WorkflowDraft = {
    id: body.id ?? `workflow_${Date.now()}`,
    userId: String(userId),
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
