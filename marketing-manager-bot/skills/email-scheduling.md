# Skill: Email Scheduling

## Purpose

Prepare a conservative email sending schedule after owner approval.

## Inputs

- Owner-approved email drafts
- Approved lead list
- Sending limits
- Timezone
- Sandbox or launch mode

## Method

1. Confirm every email has `approved_by_owner = true`.
2. Confirm every lead is approved for contact.
3. Use Europe/Stockholm timing.
4. Keep early batches small.
5. Avoid weekends unless owner requests otherwise.
6. Prepare a schedule draft without sending.

## Output Format

```yaml
email_schedule:
  timezone: "Europe/Stockholm"
  mode: "sandbox|soft_launch|live"
  batch_size: 0
  scheduled_items:
    - lead_id: ""
      email_id: ""
      scheduled_for: ""
      approved_by_owner: false
  blocked_items: []
```

## Blocking Rules

- Do not schedule when approval is missing.
- Do not schedule leads without verified contact source.
- Do not schedule large cold batches in the first launch.
- Do not store provider API keys in Markdown.

