# Lead Generation Workflow

## Goal

Create a qualified list of Swedish companies with verified contact information and clear product fit.

## Required Inputs

- Approved product positioning
- Target sector and geography
- Lead template from `leads/lead-template.md`
- Contact verification rules

## Steps

1. Swedish Market Research Agent recommends lead sectors.
2. Lead Research Agent finds real Swedish companies in the selected sector.
3. Lead Research Agent records company name, website, city, sector, source URL, and fit reason.
4. Website Analysis Agent reviews each company website for internal opportunity notes.
5. Contact Verification Agent verifies business email from official or trustworthy sources.
6. Compliance Review Agent checks that contact use is appropriate.
7. Human Approval Gate moves the list to owner review.

## Required Lead Fields

- Company name
- Website
- City
- Sector
- Source URL
- Fit reason
- Email
- Email source URL
- Confidence score
- Website analysis notes
- Approval status

## Output Status

The normal final status for this workflow is:

```yaml
status: "qualified"
approved_by_owner: false
```

Leads can move to `approved_for_contact` only after owner approval.

