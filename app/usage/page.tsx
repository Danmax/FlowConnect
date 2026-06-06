import { AppShell } from "@/components/AppShell";
import { UsageDashboard } from "@/components/UsageDashboard";
import { pricingPlans } from "@/lib/usage-billing";

export default function UsagePage() {
  return (
    <AppShell>
      <section>
        <span className="badge">Usage and billing</span>
        <h1>Plan limits and monthly usage</h1>
        <p className="lead">
          Track workflow runs, API calls, AI actions, active workflows, active connections, form submissions, and storage.
        </p>
      </section>
      <UsageDashboard />
      <section className="section grid three">
        {pricingPlans.map((plan) => (
          <article className="card" key={plan.id}>
            <h3>{plan.name}</h3>
            <p className="lead">{plan.monthlyPrice}</p>
            {plan.features.map((feature) => (
              <p key={feature}>{feature}</p>
            ))}
          </article>
        ))}
      </section>
    </AppShell>
  );
}
