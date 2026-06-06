import { NextRequest, NextResponse } from "next/server";
import { createIntakeFormForUser, listIntakeFormsForUser, type IntakeField } from "@/lib/forms-repository";
import { getRequestUserId } from "@/lib/request-user";

export async function GET(request: NextRequest) {
  const userId = await getRequestUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
  }

  const forms = await listIntakeFormsForUser(userId);

  return NextResponse.json({ forms });
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      description?: string;
      successMessage?: string;
      headerImageUrl?: string;
      theme?: "blue" | "emerald" | "rose" | "slate" | "amber";
      fontStyle?: "system" | "serif" | "mono" | "rounded";
      fields?: IntakeField[];
    };

    if (!body.name || !body.fields?.length) {
      return NextResponse.json({ error: "Form name and at least one field are required." }, { status: 400 });
    }

    const form = await createIntakeFormForUser({
      userId,
      name: body.name,
      description: body.description ?? "",
      successMessage: body.successMessage ?? "Thanks. Your response was submitted.",
      headerImageUrl: body.headerImageUrl ?? "",
      theme: body.theme ?? "blue",
      fontStyle: body.fontStyle ?? "system",
      fields: body.fields
    });

    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Form could not be saved." },
      { status: 500 }
    );
  }
}
