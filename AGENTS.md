# MARKETAGENCY — Agent Working Rules

This file is the shared contract for all AI assistants working on this codebase
(Claude Code, Codex CLI, and any future tool). Read it fully before any task.

---

## 1. What this project is

MARKETAGENCY is an **approval-gated marketing automation platform** for a Swedish
agency owner. It plans campaigns, researches leads (Google Places + custom
search), drafts outreach emails and social posts, and tracks results — but
**every external action is gated behind explicit owner approval**. The system
drafts, the owner ships.

Tech stack:
- Next.js 15 (App Router) + React 19 + TypeScript
- Prisma 6 + PostgreSQL (Supabase) — see [prisma/schema.prisma](prisma/schema.prisma)
- NextAuth v5 for owner-only authentication
- Zod for validation
- No CSS framework — bespoke styling via inline / component-scoped styles

---

## 2. The Prime Directive — Approval Gate

This is non-negotiable and shapes every feature:

- **Never** send emails automatically.
- **Never** publish to Facebook / Instagram / LinkedIn automatically.
- **Never** call paid external APIs without dry-run / approval flow.
- Every model has `approved_by_owner` and `manual_execution_required` flags. Respect them.
- Anything user-facing that triggers an external action must route through
  [src/lib/integrations/dispatcher.ts](src/lib/integrations/dispatcher.ts) and create an
  `ApprovalItem` first. The dispatcher writes to `ExecutionLog` for every attempt.
- Buttons must do something real or be hidden/disabled with a visible reason.
  Never ship "fake" buttons or stubbed handlers.

---

## 3. Architecture map

| Area | Path | Purpose |
|------|------|---------|
| Pages | [src/app/](src/app/) | Next.js App Router pages — products, leads, campaigns, approval-center, etc. |
| Server actions | [src/app/actions.ts](src/app/actions.ts) | Form/action endpoints |
| Agents runtime | [src/agents/](src/agents/) | Marketing strategist + QA safety agents, registry, router |
| Workflow engine | [src/lib/workflows/](src/lib/workflows/) | Pipelines (lead-research, daily-focus), persistence, engine |
| Integrations | [src/lib/integrations/](src/lib/integrations/) | Facebook, OpenAI, GitHub, Vercel, Email — all dispatched + audited |
| Data access | [src/lib/data-service.ts](src/lib/data-service.ts), [src/lib/db.ts](src/lib/db.ts) | Prisma client + queries |
| Live lead research | [src/lib/live-lead-research.ts](src/lib/live-lead-research.ts), [src/lib/google-places.ts](src/lib/google-places.ts) | Google Places provider |
| Components | [src/components/](src/components/) | App shell, dashboard, notices, etc. |

---

## 4. Coding rules

- **Validate before claiming done.** Run lint + build + prisma validate. UI
  changes need a visual check in the browser — don't assume green typecheck = working feature.
- **No secrets in code.** All env vars go through [src/lib/env.ts](src/lib/env.ts). Never log
  tokens, API keys, or full request bodies that may contain them.
- **Small, safe commits.** One logical change per commit. Conventional commit
  prefixes (`feat:`, `fix:`, `chore:`, `refactor:`).
- **Copy language.** Match the existing language of the page (Swedish or
  English). Don't mix unless the page is bilingual by design.
- **No premature abstractions.** Three similar lines beats a clever helper. Add
  the helper when there's a fourth caller, not before.
- **No emojis in code or commits** unless the user explicitly asks.
- **Explain what changed** at the end of every task — concise, one paragraph.

---

## 5. Validation commands

Run before declaring work done:

```bash
npm run lint
npm run typecheck
npm run build
npx prisma validate
npx prisma generate
```

On Windows PowerShell, prefer the `win:*` wrappers (e.g. `npm run win:build`) —
they handle env-loading via [scripts/windows-env.ps1](scripts/windows-env.ps1).

---

## 6. Multi-tool collaboration (Claude Code + Codex CLI + VS Code)

This repo is worked on by **multiple AI assistants in parallel**. To avoid
collisions and to maximize each tool's strengths:

### Division of labor

| Task type | Best tool | Why |
|-----------|-----------|-----|
| Architecture, multi-file refactors, planning | Claude Code | 1M context window, project memory |
| Cross-review of risky changes | The *other* tool | Independent perspective catches blind spots |
| Isolated scripts, focused functions | Either (whichever is free) | Both fine for narrow tasks |
| Visual/interactive debugging, browser testing | Human in VS Code | AI can't see the rendered UI |
| Final commit / push | Human approval | Per the Prime Directive |

### Coordination rules

- **One assistant per branch.** If Claude is working on `feat/x`, Codex picks a
  different branch — ideally a `git worktree`. Never edit the same file
  simultaneously from two assistants.
- **AGENTS.md is the source of truth** for both tools. If you discover a new
  rule or convention, update this file (don't bury it in chat history).
- **Cross-review before merge.** For non-trivial changes, ask the *other* tool
  to review the diff before the human merges. Catch each other's mistakes.
- **Document architectural decisions here**, not in commit messages. Commits rot;
  AGENTS.md is read every session.

---

## 7. Conventions for AI-generated diffs (Claude & Codex)

These rules apply to *both* assistants. They exist because AI tools, left
unchecked, produce sprawling diffs that are hard to review and risky to merge.

### Scope discipline
- **One concern per diff.** A bug fix doesn't need surrounding cleanup. If you
  notice unrelated issues, list them at the end of your reply — don't fix them
  in the same change.
- **No drive-by refactors.** Don't rename variables, reorder imports, or
  reformat code that wasn't part of the task. Editor-level reformatting causes
  noisy diffs that hide the real change.
- **Don't widen API surfaces speculatively.** Add a parameter or export only
  when there's a current caller that needs it.

### Code shape
- **Match the surrounding style.** If the file uses `const fn = () =>`, don't
  introduce `function fn()`. Consistency over preference.
- **No new comments unless they explain WHY.** Don't narrate what the code
  does, don't reference the current task or PR, don't add "// added X" markers.
- **No backwards-compat shims** for code we control. Delete the old call sites
  in the same diff; don't leave a wrapper.
- **No unused exports, parameters, or imports.** If the linter would complain,
  the human shouldn't have to either.

### Commit messages
- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`.
- Subject under 70 chars. Body explains *why*, not *what* (the diff shows what).
- One logical change per commit. Don't bundle "fix auth bug + upgrade prisma".
- No emojis. No co-author tags unless the human asks.

### Reporting back to the user
- **Lead with the result**, not the process. "Added X to Y; lint+build green"
  beats "I started by reading Z, then I noticed…".
- **Use file:line references** so the user can click through:
  `[src/auth.ts:42](src/auth.ts#L42)`.
- **Flag uncertainty.** If you skipped a validation step or guessed at an
  intent, say so. Don't claim "done" when a UI flow was never opened in the
  browser.
- **Match the user's language** — Arabic for Azzam's discussion, English for
  code/commits/AGENTS.md.

### Before declaring "done"
- `npm run lint` and `npm run build` both green (or `win:lint` / `win:build` on Windows).
- `npx prisma validate` if the schema changed.
- For UI changes: open the page in a browser and exercise the flow. If you
  can't, **say so explicitly** instead of claiming success.

---

## 8. What NEVER to do

- Bypass the approval gate "just for testing".
- Skip pre-commit hooks (`--no-verify`).
- Force-push shared branches.
- Delete migrations, drop tables, or run destructive Prisma commands without
  asking the owner first.
- Add a feature flag without a removal plan.
- Ship a button that doesn't work.
