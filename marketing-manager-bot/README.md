# Swedish AI Marketing Agency System

This folder defines the first operating layer for an AI marketing agency system focused on the Swedish market.

It is intentionally documentation-first. It does not send emails, publish social posts, scrape contacts, or connect to external APIs. Every external action must stay in draft mode until the owner approves it.

## Operating Principles

- External customer-facing copy must be in natural Swedish.
- Communication must be calm, professional, opportunity-based, and respectful.
- Do not criticize a prospect's current website, service, or business directly.
- Do not invent prices, URLs, proof, features, guarantees, or availability.
- Use only official or clearly trustworthy sources for lead contact details.
- Do not use personal email addresses unless there is a clear business reason and source.
- No email, post, image, campaign, or lead list can be sent or published without `approved_by_owner = true`.
- Keep all API keys, credentials, and secrets out of Markdown files.

## Folder Map

- `agents/` defines the marketing team roles and their operating boundaries.
- `skills/` contains reusable execution methods for research, writing, compliance, and analytics.
- `knowledge-base/` stores product, audience, offer, market, objection, and competitor information.
- `workflows/` documents the sequence of work for product onboarding, leads, outreach, social content, approvals, and analytics.
- `governance/` defines statuses, approval rules, compliance rules, and data handling constraints.
- `leads/` stores lead templates, lead lists, and analysis drafts.
- `dashboard/` defines the future dashboard structure as documentation only.

## How To Use

1. Add real product information to `knowledge-base/products.md`.
2. Add target audience notes to `knowledge-base/audiences.md`.
3. Run the relevant workflow from `workflows/`.
4. Use the matching skill files from `skills/`.
5. Save all outputs as drafts until the owner reviews them.
6. Move an item forward only when its status and approval fields allow it.

## Required Approval Gate

Any item that can reach a real person or public channel must include:

```yaml
approved_by_owner: false
approved_at: null
approved_by: null
```

The only valid condition for sending or publishing is:

```yaml
approved_by_owner: true
```

