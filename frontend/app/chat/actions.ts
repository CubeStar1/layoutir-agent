'use server'

import { createSupabaseServer } from '@/lib/supabase/server'
import { type UIMessage } from 'ai'
import { generateText } from 'ai'
import { myProvider } from '@/app/chat/lib/ai/providers/providers'

import { AppUsage } from './types'

export async function getChatById(id: string) {
  const supabase = await createSupabaseServer()
  const { data } = await supabase.from('conversations').select('*').eq('id', id).single()
  return data
}

export async function saveChat(chat: { id: string, userId: string, title: string }) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('conversations').insert({
    id: chat.id,
    user_id: chat.userId,
    title: chat.title,
  })
  if (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

export async function saveMessages(messages: UIMessage[], conversationId: string) {
  const supabase = await createSupabaseServer()

  const messagesToInsert = messages.map((message) => ({
    conversation_id: conversationId,
    role: message.role,
    parts: message.parts,
    metadata: (message as any).metadata,
  }))

  const { error } = await supabase.from('messages').insert(messagesToInsert)

  if (error) {
    console.error('Error saving messages:', error)
    throw new Error('Could not save messages')
  }
}

export async function generateTitleFromUserMessage({
  message,
  model
}: {
  message: UIMessage;
  model: string;
}) {
  const { text: title } = await generateText({
    model: myProvider.languageModel(model),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

export async function updateChatUsage(chatId: string, usage: AppUsage) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase
    .from('conversations')
    .update({ lastContext: usage })
    .eq('id', chatId)

  if (error) {
    console.error('Error updating chat usage:', error)
  }
}