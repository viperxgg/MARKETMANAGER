# Dashboard Architecture

This is a documentation-only outline for a future internal dashboard. No UI is implemented in this phase.

## Dashboard Goal

Give the owner one place to review products, leads, outreach, social content, approvals, and performance.

## Professional Operating System Views

The upgraded dashboard is organized as an internal agency command center:

1. Command Center
2. Products
3. Campaigns
4. Leads
5. Lead Research
6. Website Analysis
7. Outreach Studio
8. Social Studio
9. Approval Center
10. Manual Tracking
11. Experiments
12. Agency Memory
13. Reports
14. Settings

## Core Views

### Overview

Shows:

- Active campaigns
- Total leads
- Verified leads
- Draft emails
- Posts waiting for approval
- Scheduled posts
- Key performance indicators

### Products

Shows:

- Product name
- Audience
- Price
- Booking or purchase link
- Marketing status
- Allowed claims
- Prohibited claims

### Leads

Shows:

- Company name
- Sector
- City
- Website
- Email confidence
- Lead status
- Fit reason
- Approval state

### Outreach

Shows:

- Email drafts
- Emails waiting for compliance review
- Emails waiting for owner approval
- Scheduled emails
- Sent emails
- Replies and follow-ups

### Social Media

Shows:

- Facebook drafts
- Instagram drafts
- Image concepts
- Hashtags
- Approval status
- Publishing time

### Analytics

Shows:

- Email open rate
- Email click rate
- Reply rate
- Booking count
- Social engagement
- Follower growth
- Best-performing message angles

### Approval Center

Shows everything requiring owner review:

- Email drafts
- Social posts
- Image prompts
- Campaign plans
- Lead lists

### Settings

Shows:

- Database status
- Auth status
- Environment variable checklist
- Email provider status
- Social API status
- Manual mode status

## Safety Defaults

```yaml
draft_mode: true
approved_by_owner: false
manual_execution_required: true
live_sending_enabled: false
live_publishing_enabled: false
```

## Tablet-Friendly UI Principles

- Large touch targets.
- Clear status labels.
- Fast filtering by status.
- Side-by-side review where possible.
- Minimal visual noise.
- Premium dark interface when implemented.
