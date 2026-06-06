# Additional Platform Feature Map

## Connector SDK

The connector SDK is centered on `ConnectorDefinition`.

Each connector defines app name, icon, category, auth type, required scopes, triggers, actions, connection test, refresh token behavior, rate limit rules, and error handling rules. The starter registry includes ServiceNow, GitHub, Google Sheets, YouTube, and Wix.

Runtime helpers in `connector-runtime.ts` adapt stored encrypted connections into connector contexts. Credentials are encrypted with AES-256-GCM through `connection-secrets.ts`.

## Usage and Billing

Usage is modeled in two layers:

- `usage_events`: immutable event stream for billable activity.
- `usage_monthly_rollups`: query-friendly monthly totals.

Tracked metrics:

- Workflow runs
- API calls
- AI action usage
- Active workflows
- Active connections
- Form submissions
- Storage usage

Pricing limits live in `usage-billing.ts`. The `/api/usage/track` endpoint checks limits before accepting usage.

## Workflow Marketplace

Marketplace templates are defined in `marketplace.ts` and persisted by the `templates` and `template_ratings` tables.

Supported features:

- Browse templates
- Search templates
- Filter by app
- Filter by category
- Install template
- Clone template into user account
- Rate template
- Mark templates official

Template install calls `cloneTemplateIntoWorkflow`, which returns a draft workflow shape ready for MySQL persistence.
