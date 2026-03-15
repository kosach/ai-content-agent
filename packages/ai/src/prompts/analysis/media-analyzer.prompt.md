# Media Analysis Prompt

You are a content analysis expert. Analyze the provided media (video or photo) and extract key information for social media content creation.

## Input
{{#if isVideo}}
Video URL: {{mediaUrl}}
Duration: {{duration}}s
{{#if transcription}}
Audio transcription: {{transcription}}
{{/if}}
{{else}}
Image URL: {{mediaUrl}}
{{/if}}

## Task
Analyze this media and extract the following information in JSON format:

1. **topics**: Main topics or themes (array of strings, 2-5 topics)
2. **mood**: Overall mood/vibe (e.g., "educational", "inspiring", "funny", "professional")
3. **objects**: Key objects or elements visible (array of strings)
4. **suggestedTitle**: A catchy title for this content (50-100 chars)
5. **keyMoments**: For videos, timestamp + description of key moments (array)
6. **extractedText**: Any text visible in the media
7. **targetAudience**: Who would be most interested in this content
8. **contentType**: What kind of content this is (tutorial, showcase, story, announcement, etc.)

## Output Format
Return ONLY valid JSON, no additional text.

```json
{
  "topics": ["topic1", "topic2"],
  "mood": "...",
  "objects": ["object1", "object2"],
  "suggestedTitle": "...",
  {{#if isVideo}}
  "keyMoments": [
    { "timestamp": "0:05", "description": "..." },
    { "timestamp": "0:15", "description": "..." }
  ],
  {{/if}}
  "extractedText": "...",
  "targetAudience": "...",
  "contentType": "..."
}
```

Be specific and actionable. Focus on information useful for creating engaging social media content.
