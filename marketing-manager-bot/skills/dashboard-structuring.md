# Skill: Dashboard Structuring

## Purpose

Define the information architecture for the future internal marketing dashboard.

## Inputs

- Workflows
- Status system
- Lead fields
- Email fields
- Social post fields
- Approval requirements

## Method

1. Identify the owner decisions the dashboard must support.
2. Group views by workflow: overview, products, leads, outreach, social, analytics, approval.
3. Define minimum fields for each view.
4. Define status filters and approval controls.
5. Keep the first dashboard tablet-friendly.
6. Avoid adding implementation dependencies at this documentation stage.

## Output Format

```yaml
dashboard_structure:
  views: []
  required_fields: []
  status_filters: []
  approval_actions: []
  future_integrations: []
```

## Quality Checklist

- Shows what needs owner approval.
- Makes lead and campaign status obvious.
- Supports tablet review.
- Does not require external APIs for the first version.
- Matches the documented workflows.

