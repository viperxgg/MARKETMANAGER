# Skill: Image Prompt Generation

## Purpose

Generate image concepts and English prompts for social content.

## Inputs

- Post topic
- Product category
- Audience
- Brand visual direction
- Platform

## Method

1. Identify the visual job of the image.
2. Choose a concept related to the post, not random decoration.
3. Use a premium Swedish-inspired visual style.
4. Write a clear English prompt.
5. Include negative guidance to avoid misleading visuals.
6. Keep screenshots or UI mockups truthful if used.

## Output Format

```yaml
image_concept:
  concept: ""
  prompt_en: ""
  negative_prompt_en: ""
  platform: ""
  usage_notes: ""
  status: "draft"
  approved_by_owner: false
```

## Visual Direction Defaults

- Scandinavian minimal.
- Premium dark UI when showing software.
- Clean restaurant, cafe, or business context when relevant.
- Natural lighting.
- Realistic composition.
- No exaggerated before/after claims.

## Avoid

- Random stock-like imagery.
- Misleading dashboards.
- Fake customer logos.
- Unrealistic sales growth visuals.
- Cluttered graphics.

