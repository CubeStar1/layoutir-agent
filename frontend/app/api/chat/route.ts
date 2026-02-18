import { streamText, UIMessage, smoothStream, stepCountIs, convertToModelMessages, createUIMessageStream, JsonToSseTransformStream } from 'ai';
import { getSystemPrompt } from '@/app/chat/lib/ai/prompts/system-prompt';
import { querySupabaseTool } from '@/app/chat/lib/ai/tools/query-supabase';
import { generateChart } from '@/app/chat/lib/ai/tools/generate-chart';
import { tavilySearchTool } from '@/app/chat/lib/ai/tools/tavily-search';
import { ragRetrievalTool } from '@/app/chat/lib/ai/tools/rag-retrieval';
import { generateImage } from '@/app/chat/lib/ai/tools/generate-image';
import { createMyProvider } from '@/app/chat/lib/ai/providers/providers';
import { getUser } from '@/app/chat/hooks/get-user';
import { saveMessages, getChatById, saveChat, generateTitleFromUserMessage, updateChatUsage } from '@/app/chat/actions';
import { createSupabaseServer } from '@/lib/supabase/server';
import { fetchModels, getUsage, type ModelCatalog } from "tokenlens";
import { cache } from 'react';
import { AppUsage } from '@/app/chat/types';

export const maxDuration = 30;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err
      );
      return; // tokenlens helpers will fall back to defaultCatalog
    }
  },
  // ["tokenlens-catalog"],
  // { revalidate: 24 * 60 * 60 } // 24 hours
);

export async function POST(req: Request) {
  try {
    const user = await getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { messages, data, model, conversationID, apiKeys }: { messages: UIMessage[], data: any, model: string, conversationID: string, apiKeys?: any } = await req.json();
    
    const userMessage = messages[messages.length - 1];

    const chat = await getChatById(conversationID);

    if (chat) {
      if (chat.user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
    } else {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
        model: model,
      });

      await saveChat({
        id: conversationID,
        userId: user.id,
        title,
      });
    }

    await saveMessages([userMessage], conversationID);

    const systemPrompt = await getSystemPrompt(user);
    console.log('Selected model:', model);

    const provider = createMyProvider(apiKeys);

    let telemetry: any = null;

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const startTime = Date.now();
        let firstTokenTime: number | null = null;

        const result = streamText({
          model: provider.languageModel(model as any),
          onChunk: () => {
            if (firstTokenTime === null) {
              firstTokenTime = Date.now();
            }
          },
          system: systemPrompt,
          messages: convertToModelMessages(messages),
          tools: {
            querySupabase: querySupabaseTool,
            generateChart: generateChart,
            tavilySearch: tavilySearchTool,
            ragRetrieval: ragRetrievalTool,
            generateImage: generateImage,
          },
          stopWhen: stepCountIs(10),
          onError: (error) => {
            console.error('Error:', error);
          },
          experimental_transform: smoothStream({
            chunking: /.{10}/m,
            delayInMs: 15
          }),
          onFinish: async ({ usage }) => {
            const endTime = Date.now();
            const timeToFirstToken = firstTokenTime ? firstTokenTime - startTime : null;
            const duration = endTime - startTime;
            const tokensPerSecond = usage.outputTokens! > 0 ? parseFloat((usage.outputTokens! / (duration / 1000)).toFixed(2)) : 0;
            
            telemetry = {
                timeToFirstToken,
                tokensPerSecond,
                duration,
                usage,
                model,
            };

            let finalMergedUsage: AppUsage = { ...usage };
            try {
              const providers = await getTokenlensCatalog();
              const modelId = provider.languageModel(model as any).modelId;
              
              if (!modelId || !providers) {
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
              } else {
                const summary = getUsage({ modelId, usage, providers });
                finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
                dataStream.write({ type: "data-usage", data: finalMergedUsage });
              }
              
              // Save usage to DB
              await updateChatUsage(conversationID, finalMergedUsage);

            } catch (err) {
              console.warn("TokenLens enrichment failed", err);
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            }
          },
        });

        result.consumeStream();

        dataStream.merge(result.toUIMessageStream({
          messageMetadata: ({ part }) => {
            if (part.type === 'finish') {
              return telemetry;
            }
            return undefined;
          }
        }));
      },
      onFinish: async ({ messages: generatedMessages }) => {
        if (generatedMessages && generatedMessages.length > 0) {
          if (telemetry) {
            const lastMessage = generatedMessages[generatedMessages.length - 1];
            (lastMessage as any).metadata = telemetry;
          }
          await saveMessages(generatedMessages as any, conversationID);
        }
      },
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error: any) {
    console.error('[API] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}


export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const user = await getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return new Response('Deleted', { status: 200 });
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const user = await getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { title } = await request.json();

  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return new Response('Updated', { status: 200 });
}
