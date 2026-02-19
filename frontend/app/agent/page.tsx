import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AgentView } from "./components/agent-view";

function generateId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 32);
}

export const dynamic = "force-dynamic";

export default function AgentPage() {
  const id = generateId();

  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <AgentView id={id} initialMessages={[]} />
    </Suspense>
  );
}
