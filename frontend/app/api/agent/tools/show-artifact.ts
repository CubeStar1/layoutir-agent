import { tool } from 'ai';
import { z } from 'zod';

/**
 * Static tool for showing an artifact panel to the user.
 * The frontend intercepts the tool call to open the artifact panel.
 * The execute function returns a confirmation so the model receives tool output.
 */
export const showArtifactTool = tool({
  description: 'Show an artifact panel to the user. Call this to display long-form content like code or markdown documents. The panel is dismissable and will re-open when called again.',
  inputSchema: z.object({
    title: z.string().describe('Title for the artifact panel'),
    type: z.enum(['markdown', 'code']).describe('Display type — "markdown" for rendering markdown or "code" for rendering code blocks'),
    content: z.string().describe('The content to display in the artifact panel (markdown string or raw code string)'),
    identifier: z.string().optional().describe('Optional unique identifier for the content'),
  }),
  execute: async function ({ title, type, content, identifier }: { title: string; type: 'markdown' | 'code'; content: string; identifier?: string }) {
    return JSON.stringify({
      success: true,
      message: `Artifact panel "${title}" (${type}) is now visible to the user.`,
      identifier: identifier ?? null,
    });
  },
});
