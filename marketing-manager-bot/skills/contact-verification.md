# Skill: Contact Verification

## Purpose

Verify business email addresses from official or trustworthy sources.

## Inputs

- Lead company name
- Lead website
- Candidate email address, if any
- Source pages

## Method

1. Check the official website first.
2. Search pages such as `Kontakt`, `Om oss`, `Boka`, footer, press, or support.
3. Record the exact source URL where the email appears.
4. Prefer general business emails such as info, kontakt, bokning, hello, or sales equivalents.
5. Assign confidence.
6. Reject email addresses that cannot be sourced.

## Output Format

```yaml
contact:
  email: ""
  email_source_url: ""
  email_source_page: ""
  confidence: "low|medium|high"
  verified_at: ""
  verification_notes: ""
  usable_for_outreach: false
```

## Confidence Guide

- `high`: Email appears on the official company website.
- `medium`: Email appears on a reputable company profile or official social page.
- `low`: Email appears on a third-party listing only.

## Block When

- Email source URL is missing.
- Email is guessed from a pattern.
- Email appears personal and there is no clear business reason.
- Source looks outdated or unrelated.

