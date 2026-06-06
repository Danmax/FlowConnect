import { getOpenAIConfig, hasOpenAIConfig } from "@/lib/openai-config";
import type { FormResultsSnapshot, IntakeForm } from "@/lib/forms-repository";

export type FormSummaryPrivacy = {
  sharePrivacy: IntakeForm["sharePrivacy"];
  piiSharingMode: IntakeForm["piiSharingMode"];
};

const fallbackSummary = (snapshot: FormResultsSnapshot, privacy: FormSummaryPrivacy) => {
  const topBreakdowns = snapshot.fieldBreakdowns
    .map((field) => {
      const top = field.values[0];
      return top ? `${field.label}: ${top.label} (${top.count})` : `${field.label}: no responses`;
    })
    .join("; ");

  return [
    `${snapshot.form.name} has ${snapshot.totalSubmissions} form submissions in the current results window.`,
    topBreakdowns ? `Top response patterns: ${topBreakdowns}.` : "There are not enough categorical responses for a breakdown yet.",
    `Sharing privacy is set to ${privacy.sharePrivacy}; PII handling is set to ${privacy.piiSharingMode}.`
  ].join("\n");
};

export const createAIFormResultsSummary = async (snapshot: FormResultsSnapshot, privacy: FormSummaryPrivacy) => {
  if (!hasOpenAIConfig()) {
    return fallbackSummary(snapshot, privacy);
  }

  const config = getOpenAIConfig();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      input: [
        {
          role: "system",
          content:
            "Summarize FlowConnect form results for sharing. Be concise, operational, and do not infer hidden personal data from hashes. Mention privacy settings."
        },
        {
          role: "user",
          content: JSON.stringify({
            privacy,
            form: {
              name: snapshot.form.name,
              description: snapshot.form.description,
              piiFields: snapshot.form.fields.filter((field) => field.hashPii).map((field) => field.fieldKey)
            },
            totals: {
              submissions: snapshot.totalSubmissions,
              submissionsByDay: snapshot.submissionsByDay,
              fieldBreakdowns: snapshot.fieldBreakdowns
            },
            sampleSubmissions: snapshot.submissions.slice(0, 10)
          })
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI form summary request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  return payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text ?? fallbackSummary(snapshot, privacy);
};
