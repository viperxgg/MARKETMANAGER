# Personalized Outreach Workflow

## Goal

Create respectful, personalized Swedish outreach emails for approved leads.

## Required Inputs

- Qualified lead record
- Verified business email
- Website analysis notes
- Approved product positioning
- Approved offer or CTA

## Steps

1. Personalized Outreach Agent reads the lead and website analysis.
2. Swedish Copywriter Agent writes the email in natural Swedish.
3. Personalized Email Writing skill checks personalization quality.
4. GDPR-Safe Outreach skill checks business reason and opt-out needs.
5. Compliance Review Agent flags risks or required changes.
6. Human Approval Gate marks email as `owner_review`.
7. Owner approves or requests revision.
8. Publisher & Scheduler Agent prepares sending plan only after approval.

## Email Must Include

- Respectful greeting.
- Company-specific but non-invasive context.
- Opportunity-based product connection.
- Soft CTA.
- Sender identity placeholder.
- Opt-out line when appropriate.

## Forbidden Email Patterns

- "Your website is bad."
- "You are losing customers."
- "We guarantee more sales."
- Fake urgency.
- Claims based on unverified analysis.

## Output Status

Before owner approval:

```yaml
status: "owner_review"
approved_by_owner: false
```

After explicit owner approval:

```yaml
status: "approved_by_owner"
approved_by_owner: true
```

