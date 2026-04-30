# Approval System

The approval system exists to keep every external action under owner control.

## Approval Requirements

Owner approval is required before:

- Sending any email to a real lead.
- Scheduling any email to a real lead.
- Publishing a Facebook post.
- Publishing an Instagram post.
- Publishing or using a generated image externally.
- Contacting a lead by any other channel.
- Importing a lead list into an email provider.

## Owner Approval Record

Use this record for any approval-sensitive item:

```yaml
item_id: ""
item_type: "email|social_post|image|campaign|lead_list"
status: "owner_review"
approved_by_owner: false
approved_by: null
approved_at: null
approval_notes: ""
blocked_reason: ""
```

## Valid Approval

Approval is valid only when all conditions are true:

- `approved_by_owner = true`
- The owner explicitly approved the item.
- The approved item has not materially changed after approval.
- Compliance review did not block it.

## Material Change Rule

If content changes after owner approval, reset:

```yaml
approved_by_owner: false
status: "owner_review"
```

## Human Approval Gate Behavior

- Convert all external-facing outputs to drafts.
- Present drafts with context, source notes, and risk notes.
- Wait for explicit owner approval.
- Block publishing, sending, scheduling, or exporting when approval is missing.

