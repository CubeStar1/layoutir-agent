import { createSupabaseServer } from "@/lib/supabase/server";
import { Chat } from "../components/chat";
import { notFound } from "next/navigation";
import { getUser } from "@/app/chat/hooks/get-user"
import { Suspense } from "react";

type ParamsType = Promise<{ id: string }>

const ChatPage = async ({ params }: { params: ParamsType }) => {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const user = await getUser();

  // Fetch the conversation to verify it exists and user has access
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single();
  if (!conversation) {
    notFound();
  }

  // Verify user has access to this conversation
  if (conversation.user_id !== user?.id) {
    notFound();
  }

  const { data: dbMessages } = await supabase
    .from("messages")
    .select("id, role, parts, created_at, metadata")
    .eq("conversation_id", id)
    .order("created_at", {
      ascending: true,
    });

  const initialMessages = 
    dbMessages?.map(message => ({
      id: message.id,
      role: message.role as "user" | "assistant",
      parts: message.parts || [],
      createdAt: new Date(message.created_at),
      metadata: message.metadata,
    })) || [];

  return (
    <Chat
      key={id}
      id={id}
      initialMessages={initialMessages}
      initialLastContext={conversation.lastContext}
    />
  );
};

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <ChatPage params={props.params} />
    </Suspense>
  );
}
