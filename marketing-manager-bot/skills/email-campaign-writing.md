# Skill: Email Campaign Writing

## Purpose

Create a small, controlled Swedish email campaign sequence for approved leads.

## Inputs

- Approved product positioning
- Qualified lead segment
- Offer or demo CTA
- Sender identity
- Compliance rules

## Method

1. Define the campaign objective.
2. Write the first email as a personalized outreach draft.
3. Write one gentle follow-up only if appropriate.
4. Keep the campaign small for early testing.
5. Include opt-out wording when appropriate.
6. Mark every email as draft or owner review.

## Output Format

```yaml
email_campaign:
  campaign_id: ""
  audience: ""
  objective: ""
  emails:
    - sequence_step: 1
      subject_options_sv: []
      body_sv: ""
      delay_days: 0
      status: "draft"
      approved_by_owner: false
  compliance_notes: []
```

## Quality Checklist

- Each email has a clear reason for contact.
- Follow-up is polite and optional.
- No bulk-spam tone.
- No unsupported claims.
- Owner approval is required before sending.

