import { getOpenAIConfig } from "@/lib/openai-config";
import type { IntakeField } from "@/lib/forms-repository";

export type FormProposal = {
  name: string;
  description: string;
  successMessage: string;
  fields: IntakeField[];
};

const allowedFieldTypes = new Set(["text", "email", "number", "textarea", "dropdown", "checkbox", "date"]);

const slugifyFieldKey = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);

const fallbackProposal = (prompt: string): FormProposal => ({
  name: "AI generated intake form",
  description: prompt,
  successMessage: "Thanks. Your response was submitted.",
  fields: [
    { label: "Name", fieldKey: "name", fieldType: "text", required: true, position: 1 },
    { label: "Email", fieldKey: "email", fieldType: "email", required: true, position: 2 },
    { label: "Request details", fieldKey: "request_details", fieldType: "textarea", required: true, position: 3 }
  ]
});

const coerceProposal = (value: unknown, prompt: string): FormProposal => {
  const proposal = value as Partial<FormProposal>;
  const fallback = fallbackProposal(prompt);
  const fields = Array.isArray(proposal.fields) && proposal.fields.length > 0 ? proposal.fields : fallback.fields;

  return {
    name: proposal.name ?? fallback.name,
    description: proposal.description ?? fallback.description,
    successMessage: proposal.successMessage ?? fallback.successMessage,
    fields: fields.map((field, index) => {
      const label = String(field.label ?? `Field ${index + 1}`);
      const fieldType = allowedFieldTypes.has(String(field.fieldType)) ? field.fieldType : "text";

      return {
        label,
        fieldKey: slugifyFieldKey(String(field.fieldKey ?? label)),
        fieldType,
        required: Boolean(field.required),
        options: Array.isArray(field.options) ? field.options.map(String) : [],
        position: index + 1
      };
    })
  };
};

export const createAIFormProposal = async (prompt: string) => {
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
            "Create FlowConnect intake form proposals. Return only JSON with name, description, successMessage, and fields. Allowed fieldType values: text, email, number, textarea, dropdown, checkbox, date. fieldKey must be snake_case."
        },
        {
          role: "user",
          content: JSON.stringify({
            prompt,
            requiredShape: {
              name: "string",
              description: "string",
              successMessage: "string",
              fields: [
                {
                  label: "string",
                  fieldKey: "snake_case_string",
                  fieldType: "text | email | number | textarea | dropdown | checkbox | date",
                  required: true,
                  options: ["optional for dropdown"]
                }
              ]
            }
          })
        }
      ],
      text: {
        format: { type: "json_object" }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI form proposal request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };
  const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text;

  if (!text) {
    throw new Error("OpenAI returned an empty form proposal.");
  }

  return coerceProposal(JSON.parse(text) as unknown, prompt);
};
