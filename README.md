# MARKETMANAGER

Internal AI Marketing Agency Operating System for the Swedish market.

The dashboard prepares strategy, lead research, campaign plans, social drafts, outreach drafts, approval queues, tracking, memory, experiments, and reports. It does not publish posts, send emails, or contact leads.

## Sections

- Command Center
- Products
- Campaigns
- Leads
- Lead Research
- Website Analysis
- Outreach Studio
- Social Studio
- Approval Center
- Manual Tracking
- Experiments
- Agency Memory
- Reports
- Settings

## Local Development

```bash
npm install
npm run dev
```

## Vercel Staging

Use [DEPLOYMENT.md](./DEPLOYMENT.md) to prepare a private Vercel Preview/staging deployment and configure:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `LEAD_SEARCH_PROVIDER`
- `LEAD_SEARCH_API_KEY`

Do not commit real environment values. Configure them in Vercel Project Settings -> Environment Variables.

If this Windows shell has an invalid `ComSpec`, run:

```powershell
$env:ComSpec = "C:\Windows\System32\cmd.exe"
npm run dev
```

Or use the Windows-safe scripts:

```powershell
npm run win:dev
npm run win:db:generate
npm run win:db:push
npm run win:db:studio
```

## Database

The app is built for Prisma + PostgreSQL.

1. Copy `.env.example` to `.env`.
2. Add `DATABASE_URL` inside:

```text
C:\Users\azzam\Documents\marketagency\.env
```

Use this shape only. Do not commit or share the real value:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
```

If Supabase shows `Not IPv4 compatible` for the direct database host, use the **Session Pooler** connection string from:

```text
Supabase Dashboard -> Project Settings -> Database -> Connection string -> Session pooler
```

The pooler URL usually has a pooler host and a project-qualified username. Use the exact URL Supabase provides.

3. Run:

```bash
npm run db:generate
npm run db:push
```

Without `DATABASE_URL`, the dashboard runs in preview mode from seeded product data and validates actions without saving them.

The Settings page shows one of three database states:

- `connected`
- `missing DATABASE_URL`
- `connection error`

When `DATABASE_URL` is present and PostgreSQL is reachable, create/update actions persist to PostgreSQL. When it is missing or unreachable, preview/demo mode remains safe.

## Safety Rules

- Every publish/send/contact action remains blocked unless `approved_by_owner` is true.
- The database schema uses `approved_by_owner` and `manual_execution_required` for approval-gated execution.
- Lead qualification uses `fit_score >= 85` as a quality threshold, not a sales guarantee.
- A lead is not qualified unless the email is verified from an official company source.
- Email guessing is rejected.
- Live sending and publishing are disabled by design.
- `manual_mode = true` is the default operating mode.
