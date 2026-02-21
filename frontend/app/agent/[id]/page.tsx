import { createSupabaseServer } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getUser } from "@/app/agent/hooks/get-user";
import { Suspense } from "react";
import { AgentView } from "../components/agent-view";

type ParamsType = Promise<{ id: string }>;

const AgentChatPage = async ({ params }: { params: ParamsType }) => {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const user = await getUser();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single();

  if (conversation && conversation.user_id !== user?.id) {
    notFound();
  }

  const { data: dbMessages } = await supabase
    .from("messages")
    .select("id, role, parts, created_at, metadata")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const initialMessages =
    dbMessages?.map((message) => ({
      id: message.id,
      role: message.role as "user" | "assistant",
      parts: message.parts || [],
      createdAt: new Date(message.created_at),
      metadata: message.metadata,
    })) || [];

  return (
    <AgentView
      key={id}
      id={id}
      initialMessages={initialMessages}
    />
  );
};

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <AgentChatPage params={props.params} />
    </Suspense>
  );
}
