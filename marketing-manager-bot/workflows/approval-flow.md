# Approval Flow

## Goal

Prevent accidental publication, sending, scheduling, or external use of drafts.

## Applies To

- Emails
- Social posts
- Image prompts and images
- Campaign plans
- Lead lists
- Offers

## Steps

1. Creator agent produces a draft.
2. Compliance Review Agent checks the draft.
3. If blocked, status becomes `needs_revision`.
4. If acceptable, status becomes `owner_review`.
5. Owner reviews the exact item.
6. If approved, set `approved_by_owner = true`.
7. Publisher & Scheduler Agent may prepare scheduling only after approval.

## Reset Rule

If an approved item changes materially, reset approval:

```yaml
approved_by_owner: false
status: "owner_review"
```

## Hard Block

Never send, schedule, publish, export to provider, or contact a lead when:

```yaml
approved_by_owner: false
```

