import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { generateUUID } from "./lib/utils/generate-uuid";
import { Chat } from "./components/chat";
import { Suspense } from "react";

export const dynamic = 'force-dynamic';

const NewChatPage = async () => {
  const id = generateUUID();

  return (
    <Chat key={id} id={id} initialMessages={[]} />
  );
};

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <NewChatPage />
    </Suspense>
  );
}
