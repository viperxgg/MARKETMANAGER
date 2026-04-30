# Status System

Every lead, email, post, image concept, campaign, and dashboard item must have a clear status. Statuses are used to prevent accidental publishing or outreach.

## Content Statuses

- `draft`: Initial working version.
- `ready_for_review`: Ready for compliance review.
- `needs_revision`: Blocked until corrected.
- `approved_by_owner`: Approved by the owner.
- `scheduled`: Scheduled after approval.
- `published`: Published after approval.
- `cancelled`: Stopped and no longer active.

## Email Statuses

- `draft`: Email is being written.
- `compliance_review`: Email is being checked.
- `owner_review`: Email is waiting for owner decision.
- `approved_by_owner`: Owner approved the email.
- `scheduled`: Email is scheduled after approval.
- `sent`: Email was sent after approval.
- `replied`: Prospect replied.
- `follow_up_needed`: Follow-up is needed.
- `closed`: Conversation is complete or inactive.

## Lead Statuses

- `discovered`: Lead was found.
- `analyzed`: Lead website or digital presence was analyzed.
- `contact_verified`: Contact details were verified.
- `qualified`: Lead has enough fit and contact confidence.
- `outreach_drafted`: Outreach copy is drafted.
- `approved_for_contact`: Owner approved contacting this lead.
- `contacted`: Lead was contacted.
- `responded`: Lead responded.
- `converted`: Lead became a customer or active opportunity.
- `not_relevant`: Lead is no longer relevant.

## Required Approval Fields

```yaml
approved_by_owner: false
approved_at: null
approved_by: null
approval_notes: ""
```

## Blocking Rule

No item may move to `scheduled`, `published`, `sent`, or `contacted` unless:

```yaml
approved_by_owner: true
```

