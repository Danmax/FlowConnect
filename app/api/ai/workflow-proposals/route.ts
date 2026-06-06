import { NextRequest, NextResponse } from "next/server";
import { createAIWorkflowProposal } from "@/lib/ai-workflow-proposal";
import { getRequestUserId } from "@/lib/request-user";

export async function POST(request: NextRequest) {
  const userId = await getRequestUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    connectorId?: string;
    prompt?: string;
  };

  if (!body.connectorId || !body.prompt) {
    return NextResponse.json({ error: "Connector and prompt are required." }, { status: 400 });
  }

  try {
    const proposal = await createAIWorkflowProposal({
      connectorId: body.connectorId,
      prompt: body.prompt
    });

    return NextResponse.json({ proposal });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Workflow proposal could not be created." },
      { status: 500 }
    );
  }
}
