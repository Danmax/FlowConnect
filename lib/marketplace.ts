import type { WorkflowDraft, WorkflowStep } from "@/lib/workflow-engine";

export type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  category: "ITSM" | "Developer" | "Social" | "Website" | "AI" | "Operations";
  apps: string[];
  flow: string[];
  official: boolean;
  rating: number;
  installs: number;
  steps: Omit<WorkflowStep, "id">[];
};

export const marketplaceTemplates: WorkflowTemplate[] = [
  {
    id: "servicenow-incident-creator",
    name: "ServiceNow Incident Creator",
    description: "Turn hosted form submissions into mapped ServiceNow incidents.",
    category: "ITSM",
    apps: ["Hosted Forms", "ServiceNow"],
    flow: ["Hosted Form", "Transformation Map", "ServiceNow Incident"],
    official: true,
    rating: 4.9,
    installs: 1260,
    steps: [
      {
        type: "trigger",
        name: "Hosted Form Submission",
        inputBindings: {},
        outputFields: ["form.email", "form.name", "form.message", "form.priority"],
        config: { triggerType: "hosted_form_submission" }
      },
      {
        type: "transform",
        name: "Map Form To Incident",
        inputBindings: {
          caller_email: "{{step_1.form.email}}",
          short_description: "{{step_1.form.message}}",
          priority: "{{step_1.form.priority}}"
        },
        outputFields: ["incident.short_description", "incident.caller_email", "incident.priority"],
        config: { mapType: "field_mapping" }
      },
      {
        type: "connector_action",
        name: "Create ServiceNow Incident",
        connectorId: "servicenow",
        action: "Create Incident",
        inputBindings: {
          caller_email: "{{step_2.incident.caller_email}}",
          short_description: "{{step_2.incident.short_description}}",
          priority: "{{step_2.incident.priority}}"
        },
        outputFields: ["servicenow.sys_id", "servicenow.number", "servicenow.state"],
        config: {}
      }
    ]
  },
  {
    id: "github-issue-escalation",
    name: "GitHub Issue Escalation",
    description: "Summarize high-priority GitHub issues and open a ServiceNow case.",
    category: "Developer",
    apps: ["GitHub", "AI", "ServiceNow"],
    flow: ["GitHub Issue", "AI Summary", "ServiceNow Case"],
    official: true,
    rating: 4.8,
    installs: 934,
    steps: [
      {
        type: "trigger",
        name: "GitHub Issue Opened",
        connectorId: "github",
        action: "Issue Opened",
        inputBindings: {},
        outputFields: ["issue.title", "issue.body", "issue.url", "issue.priority"],
        config: { triggerType: "app_event" }
      },
      {
        type: "ai_action",
        name: "Summarize Issue",
        inputBindings: { text: "{{step_1.issue.body}}" },
        outputFields: ["summary.text", "summary.priority"],
        config: { action: "summarize_text" }
      },
      {
        type: "connector_action",
        name: "Create ServiceNow Case",
        connectorId: "servicenow",
        action: "Create Case",
        inputBindings: {
          short_description: "{{step_1.issue.title}}",
          description: "{{step_2.summary.text}}"
        },
        outputFields: ["case.sys_id", "case.number"],
        config: {}
      }
    ]
  },
  {
    id: "youtube-linkedin-draft",
    name: "YouTube to LinkedIn Draft",
    description: "Generate a LinkedIn draft from each new YouTube upload.",
    category: "Social",
    apps: ["YouTube", "AI", "LinkedIn"],
    flow: ["YouTube Upload", "AI Post Generator", "LinkedIn Draft"],
    official: false,
    rating: 4.7,
    installs: 702,
    steps: [
      {
        type: "trigger",
        name: "YouTube Upload",
        connectorId: "youtube",
        action: "Video Uploaded",
        inputBindings: {},
        outputFields: ["video.title", "video.description", "video.url"],
        config: { triggerType: "app_event" }
      },
      {
        type: "ai_action",
        name: "Generate LinkedIn Post",
        inputBindings: {
          title: "{{step_1.video.title}}",
          description: "{{step_1.video.description}}",
          url: "{{step_1.video.url}}"
        },
        outputFields: ["post.text", "post.hashtags"],
        config: { action: "rewrite_content" }
      },
      {
        type: "rest_api",
        name: "Create LinkedIn Draft",
        inputBindings: { body: "{{step_2.post.text}}" },
        outputFields: ["draft.id", "draft.status"],
        config: { method: "POST", url: "https://api.linkedin.com/rest/posts" }
      }
    ]
  },
  {
    id: "wix-lead-capture",
    name: "Wix Lead Capture",
    description: "Save Wix form leads to Sheets and notify the team.",
    category: "Website",
    apps: ["Wix", "Google Sheets", "Email"],
    flow: ["Wix Form", "Google Sheet", "Email Notification"],
    official: true,
    rating: 4.9,
    installs: 1518,
    steps: [
      {
        type: "trigger",
        name: "Wix Form Submission",
        connectorId: "wix",
        action: "Form Submitted",
        inputBindings: {},
        outputFields: ["lead.email", "lead.name", "lead.message"],
        config: { triggerType: "app_event" }
      },
      {
        type: "connector_action",
        name: "Append Google Sheet Row",
        connectorId: "google-sheets",
        action: "Append Row",
        inputBindings: {
          email: "{{step_1.lead.email}}",
          name: "{{step_1.lead.name}}",
          message: "{{step_1.lead.message}}"
        },
        outputFields: ["sheet.rowNumber", "sheet.updatedRange"],
        config: {}
      },
      {
        type: "rest_api",
        name: "Email Notification",
        inputBindings: { recipient: "{{step_1.lead.email}}", message: "{{step_1.lead.message}}" },
        outputFields: ["email.id", "email.status"],
        config: { method: "POST" }
      }
    ]
  },
  {
    id: "webhook-ai-summarizer",
    name: "Webhook AI Summarizer",
    description: "Summarize webhook payloads and send the result to any REST endpoint.",
    category: "AI",
    apps: ["Webhooks", "AI", "REST API"],
    flow: ["Webhook", "AI Summary", "REST API Callback"],
    official: false,
    rating: 4.6,
    installs: 488,
    steps: [
      {
        type: "trigger",
        name: "Incoming Webhook",
        inputBindings: {},
        outputFields: ["webhook.body", "webhook.source", "webhook.receivedAt"],
        config: { triggerType: "incoming_webhook" }
      },
      {
        type: "ai_action",
        name: "AI Summary",
        inputBindings: { text: "{{step_1.webhook.body}}" },
        outputFields: ["summary.text", "summary.sentiment"],
        config: { action: "summarize_text" }
      },
      {
        type: "rest_api",
        name: "REST API Callback",
        inputBindings: {
          source: "{{step_1.webhook.source}}",
          summary: "{{step_2.summary.text}}"
        },
        outputFields: ["callback.status", "callback.response"],
        config: { method: "POST" }
      }
    ]
  }
];

export const searchTemplates = (query?: string, app?: string, category?: string) => {
  const normalizedQuery = query?.trim().toLowerCase();
  const normalizedApp = app?.trim().toLowerCase();
  const normalizedCategory = category?.trim().toLowerCase();

  return marketplaceTemplates.filter((template) => {
    const matchesQuery =
      !normalizedQuery ||
      template.name.toLowerCase().includes(normalizedQuery) ||
      template.description.toLowerCase().includes(normalizedQuery);
    const matchesApp = !normalizedApp || template.apps.some((item) => item.toLowerCase().includes(normalizedApp));
    const matchesCategory = !normalizedCategory || template.category.toLowerCase() === normalizedCategory;

    return matchesQuery && matchesApp && matchesCategory;
  });
};

export const getTemplate = (id: string) => marketplaceTemplates.find((template) => template.id === id);

export const cloneTemplateIntoWorkflow = (template: WorkflowTemplate, userId: string): WorkflowDraft => ({
  id: `workflow_${template.id}_${Date.now()}`,
  userId,
  name: `${template.name} Draft`,
  sourceTemplateId: template.id,
  status: "draft",
  steps: template.steps.map((step, index) => ({
    id: `step_${index + 1}`,
    ...step,
    inputBindings: step.inputBindings ?? {},
    outputFields: step.outputFields ?? [],
    config: step.config ?? {}
  }))
});
