import { NextRequest, NextResponse } from "next/server";
import { validateWorkflowForActivation } from "@/lib/workflow-engine";
import { getRequestUserId } from "@/lib/request-user";
import { getWorkflowDraftForUser, updateWorkflowStatusForUser, type WorkflowStatus } from "@/lib/workflow-repository";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const allowedStatuses = new Set<WorkflowStatus>(["draft", "published", "active", "inactive"]);

export async function GET(request: NextRequest, context: RouteContext) {
  const userId = await getRequestUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
  }

  const { id } = await context.params;
  const workflowId = Number(id);

  if (!Number.isInteger(workflowId) || workflowId <= 0) {
    return NextResponse.json({ error: "Workflow id must be numeric." }, { status: 400 });
  }

  const workflow = await getWorkflowDraftForUser(workflowId, userId);

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
  }

  return NextResponse.json({ workflow });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const userId = await getRequestUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
  }

  const { id } = await context.params;
  const workflowId = Number(id);

  if (!Number.isInteger(workflowId) || workflowId <= 0) {
    return NextResponse.json({ error: "Workflow id must be numeric." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { status?: WorkflowStatus };
  const status = body.status;

  if (!status || !allowedStatuses.has(status)) {
    return NextResponse.json({ error: "Valid workflow status is required." }, { status: 400 });
  }

  const workflow = await getWorkflowDraftForUser(workflowId, userId);

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
  }

  if (status === "published" || status === "active") {
    const validation = validateWorkflowForActivation({ ...workflow, status });

    if (!validation.valid) {
      return NextResponse.json({ error: "Workflow has validation errors.", validation }, { status: 400 });
    }
  }

  const updated = await updateWorkflowStatusForUser({ workflowId, userId, status });

  if (!updated) {
    return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
  }

  return NextResponse.json({ message: `Workflow ${status}.`, workflow: { ...workflow, status } });
}
