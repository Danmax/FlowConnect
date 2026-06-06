import { NextRequest, NextResponse } from "next/server";
import { cloneTemplateIntoWorkflow, getTemplate } from "@/lib/marketplace";
import { getRequestUserId } from "@/lib/request-user";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
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

  return NextResponse.json(
    {
      message: "Template installed and cloned into the user account.",
      workflow
    },
    { status: 201 }
  );
}
