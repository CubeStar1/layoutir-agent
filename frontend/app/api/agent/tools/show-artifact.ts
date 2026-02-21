import { tool } from 'ai';
import { z } from 'zod';

/**
 * Static tool for showing an artifact panel to the user.
 * The frontend intercepts the tool call to open the artifact panel.
 * The execute function returns a confirmation so the model receives tool output.
 */
export const showArtifactTool = tool({
  description: 'Show an artifact panel to the user. Call this after converting a document or reading IR to display the document viewer. The panel is dismissable and will re-open when called again.',
  inputSchema: z.object({
    title: z.string().describe('Title for the artifact panel'),
    type: z.enum(['document']).describe('Display type — "document" shows the IR document viewer'),
    identifier: z.string().optional().describe('Optional unique identifier such as a document_id'),
  }),
  execute: async function ({ title, type, identifier }: { title: string; type: 'document'; identifier?: string }) {
    return JSON.stringify({
      success: true,
      message: `Artifact panel "${title}" (${type}) is now visible to the user.`,
      identifier: identifier ?? null,
    });
  },
});
