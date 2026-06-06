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
    installs: 1260
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
    installs: 934
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
    installs: 702
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
    installs: 1518
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
    installs: 488
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

export const cloneTemplateIntoWorkflow = (template: WorkflowTemplate, userId: string) => ({
  id: `workflow_${template.id}_${Date.now()}`,
  userId,
  name: `${template.name} Draft`,
  sourceTemplateId: template.id,
  status: "draft",
  steps: template.flow.map((step, index) => ({
    id: `step_${index + 1}`,
    name: step,
    order: index + 1
  })),
  createdAt: new Date().toISOString()
});
