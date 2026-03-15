import { promises as fs } from 'fs';
import path from 'path';

/**
 * Read prompt file from prompts/ directory
 * 
 * Usage:
 *   const prompt = await readPromptFile('analysis/media-analyzer.prompt.md');
 *   const rendered = renderPrompt(prompt, { mediaUrl: '...' });
 */
export async function readPromptFile(relativePath: string): Promise<string> {
  const promptsDir = path.join(__dirname, '../prompts');
  const fullPath = path.join(promptsDir, relativePath);

  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Failed to read prompt file: ${relativePath}`);
  }
}

/**
 * Simple Handlebars-style template renderer
 * 
 * Supports: {{variable}}, {{#if variable}}...{{/if}}
 * 
 * For production, use a real template engine (Handlebars, Mustache)
 */
export function renderPrompt(
  template: string,
  variables: Record<string, any>
): string {
  let rendered = template;

  // Replace {{variable}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, String(value));
  }

  // Handle {{#if variable}}...{{/if}}
  rendered = rendered.replace(
    /{{#if (\w+)}}([\s\S]*?){{\/if}}/g,
    (match, varName, content) => {
      return variables[varName] ? content : '';
    }
  );

  return rendered;
}
