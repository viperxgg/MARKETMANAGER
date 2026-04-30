# Vercel Staging Deployment

This app is an internal AI Marketing Agency OS for Smart Art AI Solutions. Deploy it to a private Vercel Preview or staging environment first, then configure APIs through Vercel Environment Variables.

The app must remain draft-only:

- No automatic email sending.
- No automatic social publishing.
- No external customer contact.
- No automatic approval.
- `approved_by_owner` remains required before any execution-related workflow.

## Vercel Readiness

The project is ready for Vercel as a Next.js App Router application.

- Build command: `npm run build`
- Install command: Vercel default `npm install`
- Runtime: Node.js server functions through Next.js
- Database: PostgreSQL through Prisma
- Prisma client generation: `postinstall` runs `prisma generate`

Do not add Gmail, Meta, Facebook publishing, or email execution integrations for staging.

## Required Environment Variables

Add these in Vercel Project Settings, not in source code.

Go to:

```text
Vercel Dashboard -> Project -> Settings -> Environment Variables
```

For a private staging deployment, add them to the `Preview` environment first. If you use a custom staging environment in Vercel, add them there instead.

```env
DATABASE_URL=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
LEAD_SEARCH_PROVIDER=manual-csv
LEAD_SEARCH_API_KEY=
```

### DATABASE_URL

Use a PostgreSQL connection string for the staging database.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
```

Use a staging database separate from production. Do not paste the local `.env` value into screenshots, build logs, tickets, or commits.

After setting the database URL, apply the Prisma schema against the staging database from a trusted machine:

```bash
npm run db:push
```

### OPENAI_API_KEY

Server-side only. Never prefix it with `NEXT_PUBLIC_`.

If it is missing, the UI stays safe and shows that OpenAI is not configured. The app should not invent live leads or execute external actions.

### OPENAI_MODEL

Recommended staging value:

```env
OPENAI_MODEL=gpt-4.1-mini
```

### LEAD_SEARCH_PROVIDER

Current safe value:

```env
LEAD_SEARCH_PROVIDER=manual-csv
```

Manual CSV import is the first real lead source. Live web search providers are planned but not implemented.

Supported planned values:

- `manual-csv`
- `google-custom-search`
- `serpapi`
- `bing-web-search`

If a live provider is selected before its adapter is implemented, the UI must show a missing/unsupported provider state and must not create fake leads.

### LEAD_SEARCH_API_KEY

Leave blank for:

```env
LEAD_SEARCH_PROVIDER=manual-csv
```

Only set this when a real live search provider adapter is implemented and reviewed.

## Safe Missing-Integration Behavior

The app intentionally supports safe degraded states:

- Missing `DATABASE_URL`: preview mode; actions are validated but not persisted.
- Missing `OPENAI_API_KEY`: AI features show configuration warnings or local safe draft behavior where implemented.
- Missing live lead provider: live research shows provider status and does not invent companies.
- Missing `LEAD_SEARCH_API_KEY`: live provider remains unavailable unless using `manual-csv`.

## Secret Handling

- `.env` and `.env.local` are ignored by Git.
- Do not log `DATABASE_URL`, `OPENAI_API_KEY`, or `LEAD_SEARCH_API_KEY`.
- Prisma production logging is disabled in app code to avoid exposing connection details in deployment logs.
- Use only server-side `process.env.*` access for secrets.
- Never expose secrets through `NEXT_PUBLIC_*`.

## Staging Checklist

1. Create or connect the Vercel project.
2. Enable Vercel deployment protection or keep the preview URL private.
3. Add the environment variables in `Project -> Settings -> Environment Variables`.
4. Scope staging variables to `Preview` or your custom staging environment.
5. Redeploy after changing environment variables.
6. Run Prisma schema setup against the staging database:

```bash
npm run db:push
```

7. Smoke test:

- `/products`
- `/products/nord-smart-menu`
- `/products/stadsync-ai`
- `/agency-brain`
- `/lead-research`
- `/approval-center`

8. Confirm safety:

- No send button performs live sending.
- No publish button performs live publishing.
- Generated work remains draft/pending review.
- Approval Center remains the final review gate.

## References

- Vercel environment variables: https://vercel.com/docs/projects/environment-variables
- Vercel project settings: https://vercel.com/docs/projects/project-configuration/project-settings
- Vercel environments: https://vercel.com/docs/deployments/environments
