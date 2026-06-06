import { NextRequest, NextResponse } from "next/server";
import { deleteIntakeFormForUser, updateIntakeFormForUser, type IntakeField, type IntakeForm } from "@/lib/forms-repository";
import { getRequestUserId } from "@/lib/request-user";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const parseFormId = async (context: RouteContext) => {
  const { id } = await context.params;
  const formId = Number(id);

  return Number.isInteger(formId) && formId > 0 ? formId : null;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getRequestUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
    }

    const formId = await parseFormId(context);

    if (!formId) {
      return NextResponse.json({ error: "Form id must be numeric." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      description?: string;
      successMessage?: string;
      headerImageUrl?: string;
      theme?: IntakeForm["theme"];
      fontStyle?: IntakeForm["fontStyle"];
      fields?: IntakeField[];
    };

    if (!body.name || !body.fields?.length) {
      return NextResponse.json({ error: "Form name and at least one field are required." }, { status: 400 });
    }

    const form = await updateIntakeFormForUser({
      formId,
      userId,
      name: body.name,
      description: body.description ?? "",
      successMessage: body.successMessage ?? "Thanks. Your response was submitted.",
      headerImageUrl: body.headerImageUrl ?? "",
      theme: body.theme ?? "blue",
      fontStyle: body.fontStyle ?? "system",
      fields: body.fields
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found." }, { status: 404 });
    }

    return NextResponse.json({ form });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Form could not be updated." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getRequestUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
    }

    const formId = await parseFormId(context);

    if (!formId) {
      return NextResponse.json({ error: "Form id must be numeric." }, { status: 400 });
    }

    const deleted = await deleteIntakeFormForUser(formId, userId);

    if (!deleted) {
      return NextResponse.json({ error: "Form not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Form deleted." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Form could not be deleted." },
      { status: 500 }
    );
  }
}
