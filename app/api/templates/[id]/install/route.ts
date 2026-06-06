import { NextRequest, NextResponse } from "next/server";
import { cloneTemplateIntoWorkflow, getTemplate } from "@/lib/marketplace";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const template = getTemplate(id);

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const userId = request.headers.get("x-flowconnect-user-id") ?? "demo-user";
  const workflow = cloneTemplateIntoWorkflow(template, userId);

  return NextResponse.json(
    {
      message: "Template installed and cloned into the user account.",
      workflow
    },
    { status: 201 }
  );
}
