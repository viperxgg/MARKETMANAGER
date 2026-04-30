# Skill: Compliance Checking

## Purpose

Review drafts for legal, ethical, and brand-safety issues before owner approval.

## Inputs

- Draft email, post, image prompt, lead list, or offer
- Product facts
- Lead source notes
- Governance rules

## Method

1. Check factual claims against the knowledge base.
2. Check tone for pressure, criticism, or embarrassment.
3. Check GDPR-safe outreach basics for emails and leads.
4. Check visual prompts for misleading implications.
5. Check approval fields.
6. Return pass, revision, or block.

## Output Format

```yaml
compliance_review:
  result: "pass|needs_revision|blocked"
  issues: []
  required_changes: []
  notes: ""
  next_status: "owner_review|needs_revision"
```

## Block When

- Unsupported guarantee.
- Aggressive or shaming language.
- Missing contact source.
- Missing opt-out where needed.
- Fake proof or fake customer story.
- Attempt to send or publish without approval.

## Pass Means

`pass` means ready for owner review. It does not mean approved for sending or publishing.

