"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPromptFile = readPromptFile;
exports.renderPrompt = renderPrompt;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
/**
 * Read prompt file from prompts/ directory
 *
 * Usage:
 *   const prompt = await readPromptFile('analysis/media-analyzer.prompt.md');
 *   const rendered = renderPrompt(prompt, { mediaUrl: '...' });
 */
async function readPromptFile(relativePath) {
    const promptsDir = path_1.default.join(__dirname, '../prompts');
    const fullPath = path_1.default.join(promptsDir, relativePath);
    try {
        const content = await fs_1.promises.readFile(fullPath, 'utf-8');
        return content;
    }
    catch (error) {
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
function renderPrompt(template, variables) {
    let rendered = template;
    // Replace {{variable}}
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        rendered = rendered.replace(regex, String(value));
    }
    // Handle {{#if variable}}...{{/if}}
    rendered = rendered.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
        return variables[varName] ? content : '';
    });
    return rendered;
}
//# sourceMappingURL=loader.js.map