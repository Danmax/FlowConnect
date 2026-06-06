import { NextRequest, NextResponse } from "next/server";
import { createAIFormResultsSummary } from "@/lib/ai-form-summary";
import {
  getFormResultsForUser,
  preparePayloadForSharing,
  updateFormSharingPrivacyForUser,
  type IntakeForm
} from "@/lib/forms-repository";
import { getRequestUserId } from "@/lib/request-user";

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
    const formId = Number(id);

    if (!Number.isInteger(formId) || formId <= 0) {
      return NextResponse.json({ error: "Form id must be numeric." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      sharePrivacy?: IntakeForm["sharePrivacy"];
      piiSharingMode?: IntakeForm["piiSharingMode"];
    };
    const snapshot = await getFormResultsForUser(formId, userId);

    if (!snapshot) {
      return NextResponse.json({ error: "Form not found." }, { status: 404 });
    }

    const privacy = {
      sharePrivacy: body.sharePrivacy ?? snapshot.form.sharePrivacy,
      piiSharingMode: body.piiSharingMode ?? snapshot.form.piiSharingMode
    };
    await updateFormSharingPrivacyForUser({ formId, userId, ...privacy });

    const sanitizedSnapshot = {
      ...snapshot,
      submissions: snapshot.submissions.map((submission) => ({
        ...submission,
        payload: preparePayloadForSharing(snapshot.form, submission.payload, privacy.piiSharingMode)
      }))
    };
    const summary = await createAIFormResultsSummary(sanitizedSnapshot, privacy);

    return NextResponse.json({ summary, privacy });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Form summary could not be created." },
      { status: 500 }
    );
  }
}
