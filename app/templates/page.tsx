import { AppShell } from "@/components/AppShell";
import { TemplateCard } from "@/components/TemplateCard";
import { searchTemplates } from "@/lib/marketplace";

type TemplatesPageProps = {
  searchParams: Promise<{
    q?: string;
    app?: string;
    category?: string;
  }>;
};

export default async function TemplatesPage({ searchParams }: TemplatesPageProps) {
  const params = await searchParams;
  const templates = searchTemplates(params.q, params.app, params.category);

  return (
    <AppShell>
      <section>
        <span className="badge">Workflow marketplace</span>
        <h1>Browse and install workflow templates</h1>
        <p className="lead">Search, filter by app or category, install templates, clone them into an account, and rate them.</p>
      </section>
      <form className="panel" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <input aria-label="Search templates" name="q" placeholder="Search templates" defaultValue={params.q} />
        <input aria-label="Filter by app" name="app" placeholder="Filter by app" defaultValue={params.app} />
        <input aria-label="Filter by category" name="category" placeholder="Filter by category" defaultValue={params.category} />
        <button className="button primary" type="submit">
          Apply filters
        </button>
      </form>
      <section className="section grid two">
        {templates.map((template) => (
          <TemplateCard template={template} key={template.id} />
        ))}
      </section>
    </AppShell>
  );
}
