# Skill: Lead Research

## Purpose

Find real Swedish companies that match an approved product and audience.

## Inputs

- Product positioning
- Target sector
- Target city or region
- Fit criteria
- Exclusion criteria

## Method

1. Define what makes a lead relevant.
2. Search for real companies in the selected Swedish sector.
3. Prefer official company websites, Google Business profiles, industry directories, and reputable sources.
4. Record company name, website, city, sector, and source URL.
5. Write a specific fit reason.
6. Leave contact verification to the Contact Verification skill.

## Output Format

```yaml
lead_id: ""
company_name: ""
website: ""
city: ""
sector: ""
source_url: ""
fit_reason: ""
status: "discovered"
approved_by_owner: false
```

## Quality Checklist

- Company is real and located in Sweden.
- Lead has a meaningful connection to the product.
- Source URL is included.
- Fit reason is specific.
- No contact action is taken.

## Reject Leads When

- There is no clear product fit.
- The source is unreliable.
- The company appears inactive.
- The lead is included only because it is easy to find.

