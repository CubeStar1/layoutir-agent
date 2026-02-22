"use client";

import { UIMessage } from "ai";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { AgentChat } from "./agent-chat";
import { ArtifactPanel } from "./artifact-panel";
import { useEffect } from "react";
import { useAgentStore } from "../store/agent-store";

interface AgentViewProps {
  id: string;
  initialMessages?: UIMessage[];
}

export function AgentView({ id, initialMessages = [] }: AgentViewProps) {
  const artifactStateOpen = useAgentStore((state) => state.artifactState.isOpen);

  return (
    <div className="h-dvh flex flex-col">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Chat Panel — always visible, takes full width when artifact is closed */}
        <ResizablePanel defaultSize={artifactStateOpen ? 45 : 100} minSize={30}>
          <AgentChat
            id={id}
            initialMessages={initialMessages}
          />
        </ResizablePanel>

        {/* Artifact Panel — slides in from the right when open */}
        {artifactStateOpen && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={55} minSize={25}>
              <ArtifactPanel />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
