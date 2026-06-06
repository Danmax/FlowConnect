import { NextRequest, NextResponse } from "next/server";
import { createAIFormProposal } from "@/lib/ai-form-proposal";
import { getRequestUserId } from "@/lib/request-user";

export async function POST(request: NextRequest) {
  const userId = await getRequestUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    prompt?: string;
  };

  if (!body.prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  try {
    const proposal = await createAIFormProposal(body.prompt);

    return NextResponse.json({ proposal });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Form proposal could not be created." },
      { status: 500 }
    );
  }
}
