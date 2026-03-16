/**
 * Read prompt file from prompts/ directory
 *
 * Usage:
 *   const prompt = await readPromptFile('analysis/media-analyzer.prompt.md');
 *   const rendered = renderPrompt(prompt, { mediaUrl: '...' });
 */
export declare function readPromptFile(relativePath: string): Promise<string>;
/**
 * Simple Handlebars-style template renderer
 *
 * Supports: {{variable}}, {{#if variable}}...{{/if}}
 *
 * For production, use a real template engine (Handlebars, Mustache)
 */
export declare function renderPrompt(template: string, variables: Record<string, any>): string;
//# sourceMappingURL=loader.d.ts.map