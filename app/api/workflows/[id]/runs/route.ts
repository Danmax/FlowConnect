import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/request-user";
import { listWorkflowRunsForUser } from "@/lib/workflow-repository";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

  const runs = await listWorkflowRunsForUser(workflowId, userId);

  return NextResponse.json({ runs });
}
