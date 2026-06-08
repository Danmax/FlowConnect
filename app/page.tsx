import { Bot, Cable, FileJson, FormInput, Gauge, ListChecks, PlayCircle, Store } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { requireCurrentUser } from "@/lib/require-auth";
import { pricingPlans } from "@/lib/usage-billing";

const features = [
  ["App Integrations", Cable],
  ["AI Actions", Bot],
  ["Hosted Forms", FormInput],
  ["REST APIs", FileJson],
  ["Transformation Maps", ListChecks],
  ["Workflow Testing", PlayCircle],
  ["Usage Billing", Gauge],
  ["Templates Marketplace", Store]
];

export default async function Home() {
  await requireCurrentUser();

  return (
    <AppShell>
      <section className="hero">
        <div>
          <span className="badge">Workflow automation made simple</span>
          <h1>Connect apps, AI, APIs, and forms.</h1>
          <p className="lead">
            FlowConnect AI gives teams a guided workflow builder, modular connector SDK, usage billing, and a ready-to-use
            workflow marketplace.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <a className="button primary" href="/templates">
              Browse templates
            </a>
            <a className="button" href="/connectors">
              View connectors
            </a>
          </div>
        </div>
        <div className="panel">
          <h2>Example workflow</h2>
          <p className="template-flow">Hosted Form {"->"} Transformation Map {"->"} ServiceNow Incident</p>
          <p className="muted">Queue-ready execution with retry rules, connector limits, and full run tracking.</p>
        </div>
      </section>

      <section className="section">
        <h2>Platform features</h2>
        <div className="grid four grid three">
          {features.map(([label, Icon]) => (
            <article className="card" key={label as string}>
              <Icon size={28} color="#2563eb" aria-hidden="true" />
              <h3>{label as string}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Pricing</h2>
        <div className="grid three">
          {pricingPlans.map((plan) => (
            <article className="card" key={plan.id}>
              <span className="badge">{plan.monthlyPrice}</span>
              <h3>{plan.name}</h3>
              {plan.features.map((feature) => (
                <p key={feature}>{feature}</p>
              ))}
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
