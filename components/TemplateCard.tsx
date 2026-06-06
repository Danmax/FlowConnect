import type { WorkflowTemplate } from "@/lib/marketplace";

export function TemplateCard({ template }: { template: WorkflowTemplate }) {
  return (
    <article className="card">
      <div style={{ alignItems: "center", display: "flex", gap: 10, justifyContent: "space-between" }}>
        <span className="badge">{template.category}</span>
        {template.official ? <span className="badge">Official</span> : null}
      </div>
      <h3 style={{ marginTop: 14 }}>{template.name}</h3>
      <p className="muted">{template.description}</p>
      <p className="template-flow">{template.flow.join(" -> ")}</p>
      <p className="muted">
        Apps: {template.apps.join(", ")} | Rating: {template.rating} | Installs: {template.installs.toLocaleString()}
      </p>
      <form action={`/api/templates/${template.id}/install`} method="post">
        <button className="button primary" type="submit">
          Install template
        </button>
      </form>
    </article>
  );
}
