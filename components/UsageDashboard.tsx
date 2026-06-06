import { emptyUsageSnapshot, getUsageSummary, usageMetricLabels } from "@/lib/usage-billing";

const trackedMetrics = [
  "workflowRuns",
  "apiCalls",
  "aiActionUsage",
  "activeWorkflows",
  "activeConnections",
  "formSubmissions",
  "storageMb"
] as const;

export function UsageDashboard() {
  const summary = getUsageSummary(emptyUsageSnapshot);

  return (
    <section className="grid two">
      <article className="panel">
        <span className="badge">Current plan</span>
        <h1>{summary.plan.name}</h1>
        <p className="lead">
          {emptyUsageSnapshot.periodStart} through {emptyUsageSnapshot.periodEnd}
        </p>
        <h2>
          {summary.remainingWorkflowRuns === null ? "Custom" : summary.remainingWorkflowRuns.toLocaleString()} workflow
          runs remaining
        </h2>
        <div className="usage-bar" aria-label="Workflow run usage">
          <span style={{ width: `${summary.workflowRunPercent}%` }} />
        </div>
        <p className="muted">{emptyUsageSnapshot.workflowRuns.toLocaleString()} runs used this month</p>
        {summary.isNearLimit ? <p className="badge">Approaching plan limit</p> : null}
        <a className="button primary" href="#upgrade">
          Upgrade plan
        </a>
      </article>

      <article className="panel" id="upgrade">
        <h2>Usage tracked</h2>
        <div className="grid two">
          {trackedMetrics.map((metric) => (
            <div className="card" key={metric}>
              <strong>{usageMetricLabels[metric]}</strong>
              <p className="lead" style={{ margin: "8px 0 0" }}>
                {metric === "storageMb" ? `${emptyUsageSnapshot[metric]} MB` : emptyUsageSnapshot[metric].toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
