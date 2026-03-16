# Revise Drafts Prompt

You are revising social media content based on user feedback.

## Original Draft

**YouTube Short:**
- Title: {{originalYoutubeTitle}}
- Description: {{originalYoutubeDescription}}
- Hashtags: {{originalYoutubeHashtags}}

**Facebook Post:**
- Text: {{originalFacebookText}}
- Hashtags: {{originalFacebookHashtags}}

## User Feedback

{{userFeedback}}

## Original Context

- **User Intent:** {{userIntent}}
- **Tone:** {{tone}}
- **Topics:** {{topics}}
- **Target Audience:** {{targetAudience}}

## Task

Generate a **REVISED** version of the content that addresses the user's feedback while maintaining:
- The original intent and core message
- Platform-specific requirements (YouTube Shorts, Facebook posts)
- Proper formatting and structure
- SEO and engagement optimization

## Revision Guidelines

1. **Listen to feedback:** Directly address what the user asked for
2. **Preserve quality:** Don't sacrifice engagement for changes
3. **Maintain brand voice:** Keep the {{tone}} tone
4. **Platform optimization:** Keep title/description lengths optimal
5. **Hashtag relevance:** Update hashtags if feedback requests it

## Output Format

Return ONLY valid JSON:

```json
{
  "youtubeShort": {
    "title": "Revised title (60-100 chars)",
    "description": "Revised description with context and value.\n\nCall to action!\n\n#hashtags",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
  },
  "facebookPost": {
    "text": "Revised Facebook post text.\n\nEngaging hook and CTA!",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
  },
  "changesSummary": "Brief summary of what was changed and why"
}
```

**Important:** Return ONLY the JSON object, no additional text or explanation outside the JSON.
