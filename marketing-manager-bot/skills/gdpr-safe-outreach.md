# Skill: GDPR-Safe Outreach

## Purpose

Check whether a proposed outreach action follows basic GDPR-safe and respectful B2B outreach practices.

## Inputs

- Lead record
- Contact source URL
- Outreach email draft
- Business reason for contact
- Sending context

## Method

1. Confirm the lead is a relevant business target.
2. Confirm the email address is published by the company or otherwise trustworthy.
3. Confirm the message is personalized and relevant.
4. Confirm the message uses a clear business reason.
5. Confirm the message avoids sensitive personal data.
6. Add opt-out wording when appropriate.
7. Keep the campaign small and manually reviewed.

## Output Format

```yaml
gdpr_review:
  result: "pass|needs_revision|blocked"
  business_reason: ""
  contact_source_ok: false
  personalization_ok: false
  opt_out_needed: false
  opt_out_text_sv: ""
  risks: []
```

## Suggested Opt-Out Text

```text
Om det inte är relevant för er är det bara att säga till, så kontaktar jag er inte igen.
```

## Block When

- Contact source is missing.
- Lead fit reason is weak or absent.
- Email is generic bulk outreach.
- Message contains pressure, fear, or unsupported claims.
- Owner approval is missing for sending.

