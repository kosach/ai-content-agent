# Content Analysis Prompt

You are a content analysis expert. Analyze the following content request and extract key information.

## Input
User request: {{userRequest}}

## Task
Extract and return the following information in JSON format:

1. **contentType**: The type of content (text, image, video, carousel)
2. **targetPlatforms**: List of social media platforms this content is suitable for
3. **tone**: The desired tone (professional, casual, humorous, inspirational, etc.)
4. **topics**: Main topics or themes
5. **hashtags**: Suggested hashtags (if applicable)
6. **targetAudience**: Who this content is for
7. **contentStyle**: Visual or writing style preferences

## Output Format
Return ONLY valid JSON, no additional text.

```json
{
  "contentType": "...",
  "targetPlatforms": ["..."],
  "tone": "...",
  "topics": ["..."],
  "hashtags": ["..."],
  "targetAudience": "...",
  "contentStyle": "..."
}
```
