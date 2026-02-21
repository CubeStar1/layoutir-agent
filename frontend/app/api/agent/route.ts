import { getMCPTools } from '@/lib/ai/mcp/mcp-client';
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  stepCountIs,
} from 'ai';
import { createMyProvider } from '@/app/agent/lib/ai/providers/providers';
import { getUser } from '@/app/agent/hooks/get-user';
import { saveMessages, getChatById, saveChat, generateTitleFromUserMessage } from '@/app/agent/actions';

export const maxDuration = 300;

const SYSTEM_PROMPT = `You are a document editing agent powered by LayoutIR.

You have access to MCP tools for document processing. The tools are prefixed with "layoutir_".

## Workflow
1. When the user uploads a document, use \`layoutir_convert_document\` to convert it to IR — it returns a \`document_id\`
2. Use \`layoutir_read_ir\` with the \`document_id\` to understand the document structure
3. IMPORTANT: After reading, always call \`layoutir_get_ir_json\` with the \`document_id\` — the frontend needs this to display the document with bounding boxes
4. Use \`layoutir_edit_ir_block\`, \`layoutir_add_ir_block\`, or \`layoutir_delete_ir_block\` with the \`document_id\` and \`block_id\`
5. After any edit, call \`layoutir_get_ir_json\` again so the frontend viewer updates
6. Use \`layoutir_export_to_markdown\` with the \`document_id\` to export the final document

## Important Rules
- All tools reference documents by \`document_id\` — you do NOT pass raw IR JSON
- Always call \`layoutir_read_ir\` first to see the document structure before making edits
- When editing, reference blocks by their \`block_id\`
- After ANY tool that reads or modifies the IR, also call \`layoutir_get_ir_json\` so the frontend can update its viewer with full bounding box data

## IR Structure
Each block has: block_id, type (paragraph/heading/list), content (text), order (position), metadata.label, bbox (bounding box coordinates)
`;

export async function POST(req: Request) {
  try {
    const user = await getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const {
      messages,
      model='gpt-4.1-mini',
      conversationID,
      documentContext,
    }: {
      messages: UIMessage[];
      model?: string;
      conversationID?: string;
      documentContext?: { filePath?: string; documentId?: string };
    } = await req.json();

    const userMessage = messages[messages.length - 1];

    // Create or verify conversation
    if (conversationID) {
      const chat = await getChatById(conversationID);
      if (chat) {
        if (chat.user_id !== user.id) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
      } else {
        const title = await generateTitleFromUserMessage({
          message: userMessage,
          model: model || 'gpt-4.1-mini',
        });
        await saveChat({
          id: conversationID,
          userId: user.id,
          title,
        });
      }

      // Save user message
      await saveMessages([userMessage], conversationID);
    }

    const provider = createMyProvider();
    console.log("Model:", model);

    // Get MCP tools (includes layoutir_ prefixed tools)
    let mcpTools: Record<string, any> = {};
    try {
      mcpTools = await getMCPTools();
    } catch (error) {
      console.error('[Agent] Failed to get MCP tools:', error);
    }

    // Build system prompt with document context
    let systemPrompt = SYSTEM_PROMPT;
    if (documentContext?.documentId) {
      systemPrompt += `\n\nThe current document_id is: ${documentContext.documentId}`;
    }
    if (documentContext?.filePath) {
      systemPrompt += `\nThe uploaded file is at: ${documentContext.filePath}`;
    }

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const modelMessages = await convertToModelMessages(messages)
        const result = streamText({
          model: provider.languageModel(model as any),
          system: systemPrompt,
          messages: modelMessages,
          tools: mcpTools,
          stopWhen: stepCountIs(15),
          onError: (error) => {
            console.error('[Agent] Stream error:', error);
          },
        });

        result.consumeStream();
        dataStream.merge(result.toUIMessageStream());
      },
      onFinish: async ({ messages: generatedMessages }) => {
        if (conversationID && generatedMessages && generatedMessages.length > 0) {
          await saveMessages(generatedMessages as any, conversationID);
        }
      },
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error: any) {
    console.error('[Agent] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

