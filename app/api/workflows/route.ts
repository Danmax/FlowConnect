import { NextRequest, NextResponse } from "next/server";
import { createWorkflowRunRecord, validateWorkflowForActivation, type WorkflowDraft } from "@/lib/workflow-engine";
import { getRequestUserId } from "@/lib/request-user";
import { listWorkflowsForUser, saveWorkflowDraftForUser } from "@/lib/workflow-repository";

export async function GET(request: NextRequest) {
  const userId = await getRequestUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
  }

  const workflows = await listWorkflowsForUser(userId);

  return NextResponse.json({ workflows });
}

export async function POST(request: NextRequest) {
  const userId = await getRequestUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<WorkflowDraft> & {
    triggerData?: Record<string, unknown>;
  };
  const workflow: WorkflowDraft = {
    id: body.id ?? `workflow_${Date.now()}`,
    databaseId: body.databaseId,
    userId: String(userId),
    name: body.name ?? "Untitled workflow",
    status: body.status ?? "draft",
    sourceTemplateId: body.sourceTemplateId,
    steps: body.steps ?? []
  };
  const validation = workflow.status === "draft" ? { valid: true, errors: [] } : validateWorkflowForActivation(workflow);
  const run = createWorkflowRunRecord(workflow, body.triggerData ?? {});

  if (!validation.valid) {
    return NextResponse.json(
      {
        message: "Workflow draft has validation errors.",
        workflow,
        validation
      },
      { status: 400 }
    );
  }

  const savedWorkflow = await saveWorkflowDraftForUser(workflow);

  if (!savedWorkflow) {
    return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      message: workflow.status === "draft" ? "Workflow draft saved." : "Workflow saved.",
      workflow: savedWorkflow,
      validation,
      run
    },
    { status: 201 }
  );
}
