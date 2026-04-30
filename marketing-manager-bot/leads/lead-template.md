# Lead Template

Use this template for every lead. Do not add a lead to outreach unless it has a fit reason, source URL, and contact verification result.

```yaml
lead_id: ""
company_name: ""
website: ""
city: ""
country: "Sweden"
sector: ""
source_url: ""
source_checked_at: ""
fit_reason: ""
status: "discovered"

contact:
  email: ""
  email_source_url: ""
  email_source_page: ""
  confidence: "unknown|low|medium|high"
  verified_at: ""
  verification_notes: ""

analysis:
  website_summary: ""
  customer_journey_notes: ""
  opportunity_angle_internal: ""
  outreach_safe_angle: ""
  do_not_mention: []

approval:
  approved_by_owner: false
  approved_at: null
  approved_by: null
  approval_notes: ""
```

## Fit Reason Standard

A valid fit reason must explain:

- Why this company is relevant to the product.
- Which customer journey or business process could improve.
- Why the outreach is respectful and appropriate.

Weak fit reasons such as "has a website" or "is in Sweden" are not enough.

