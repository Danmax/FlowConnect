import { NextRequest, NextResponse } from "next/server";
import { getPublishedIntakeFormBySlug, saveIntakeSubmission } from "@/lib/forms-repository";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const form = await getPublishedIntakeFormBySlug(slug);

    if (!form) {
      return NextResponse.json({ error: "Form not found." }, { status: 404 });
    }

    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const submission = await saveIntakeSubmission(form, payload, {
      userAgent: request.headers.get("user-agent"),
      forwardedFor: request.headers.get("x-forwarded-for")
    });

    return NextResponse.json({
      message: form.successMessage,
      submission
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Form submission failed." },
      { status: 400 }
    );
  }
}
