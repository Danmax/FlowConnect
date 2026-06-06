# FlowConnect AI

FlowConnect AI is a Next.js SaaS scaffold for workflow automation across app connectors, AI actions, hosted forms, REST APIs, transformation maps, usage billing, and a workflow template marketplace.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Database

Create `.env.local` from `.env.example` and set the Hostinger MySQL password:

```bash
cp .env.example .env.local
```

Configured defaults:

- `DB_HOST=srv2104.hstgr.io`
- `DB_NAME=u130206374_FlowConnect`
- `DB_USER=u130206374_flow`

Deploy the MySQL schema after `DB_PASSWORD` is set:

```bash
npm run db:deploy
```

Check database connectivity from the app:

```text
GET /api/health/db
```

## Implemented Feature Areas

- Connector SDK with typed metadata, auth, scopes, triggers, actions, connection testing, token refresh, rate limits, and error handling.
- Starter SDK connectors for ServiceNow, GitHub, Google Sheets, YouTube, and Wix.
- Usage and billing engine with Starter, Pro, and Enterprise plan definitions.
- Usage dashboard for current plan, monthly usage, remaining workflow runs, and upgrade CTA.
- Workflow marketplace with browse, search, app/category filters, install/clone, ratings, official templates, and five starter templates.
- API routes for connector registry, connector health tests, token refresh, usage tracking, template install/rating, and workflow draft/run creation.
- MySQL schema for users, connectors, workflows, runs, logs, usage events, usage rollups, templates, and template ratings.

## Key Files

- `lib/connector-sdk.ts`: Connector contract and starter connector registry.
- `lib/connector-runtime.ts`: Stored connection runtime helpers for decrypting credentials, testing connections, and refreshing tokens.
- `lib/usage-billing.ts`: Pricing tiers, usage metrics, demo usage snapshot, and summary calculations.
- `lib/usage-events.ts`: Usage event creation, plan limit checks, and projected usage rollups.
- `lib/marketplace.ts`: Template definitions, search/filter helper, and clone helper.
- `lib/workflow-engine.ts`: Workflow validation and run record creation.
- `lib/db.ts`: MySQL pool configured from environment variables.
- `sql/schema.sql`: MySQL schema for the new platform features.

## Adding a Connector

Add a new `ConnectorDefinition` entry in `lib/connector-sdk.ts` with:

- `id`
- `appName`
- `appIcon`
- `category`
- `authType`
- `requiredScopes`
- `availableTriggers`
- `availableActions`
- `rateLimitRules`
- `errorHandlingRules`
- `testConnection`
- `refreshToken`

The core workflow engine should call connector definitions through the registry instead of hard-coding app-specific logic.

## Production Notes

- Replace `demoSecretProvider` with envelope encryption backed by a server-only key management strategy.
- Persist usage events and monthly rollups in MySQL using `sql/schema.sql`.
- Enqueue workflow runs into BullMQ after `createWorkflowRunRecord`.
- Recalculate template ratings from `template_ratings` rather than trusting client-submitted aggregates.
- Enforce usage limits before workflow activation, connection creation, API calls, AI actions, form submissions, and storage writes.
