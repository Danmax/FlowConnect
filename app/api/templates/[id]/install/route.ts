import { NextRequest, NextResponse } from "next/server";
import { cloneTemplateIntoWorkflow, getTemplate } from "@/lib/marketplace";
import { getRequestUserId } from "@/lib/request-user";
import { saveWorkflowDraftForUser } from "@/lib/workflow-repository";
import { validateWorkflowForActivation } from "@/lib/workflow-engine";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getRequestUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
    }

    const { id } = await context.params;
    const template = getTemplate(id);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const workflow = cloneTemplateIntoWorkflow(template, String(userId));
    const validation = validateWorkflowForActivation(workflow);

    if (!validation.valid) {
      return NextResponse.json({ error: "Template has validation errors.", validation }, { status: 400 });
    }

    const savedWorkflow = await saveWorkflowDraftForUser(workflow);

    return NextResponse.json(
      {
        message: "Template installed and cloned into your workflows.",
        workflow: savedWorkflow
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Template could not be installed." },
      { status: 500 }
    );
  }
}
