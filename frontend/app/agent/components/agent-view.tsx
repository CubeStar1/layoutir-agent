"use client";

import { UIMessage } from "ai";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { AgentChat } from "./agent-chat";
import { ArtifactPanel } from "./artifact-panel";
import { useState, useCallback } from "react";
import type { ArtifactState } from "../types";

interface AgentViewProps {
  id: string;
  initialMessages?: UIMessage[];
}

export interface DocumentState {
  filePath?: string;
  fileName?: string;
  irJson?: string;
  documentId?: string;
  /** Whether the agent is currently streaming / processing */
  isAgentWorking?: boolean;
}

export function AgentView({ id, initialMessages = [] }: AgentViewProps) {
  const [documentState, setDocumentState] = useState<DocumentState>({});
  const [artifactState, setArtifactState] = useState<ArtifactState>({
    isOpen: false,
    displayType: 'document',
  });

  const handleFileUploaded = useCallback(
    (filePath: string, fileName: string) => {
      setDocumentState((prev) => ({ ...prev, filePath, fileName }));
    },
    []
  );

  const handleIRUpdate = useCallback((irJson: string, documentId?: string) => {
    setDocumentState((prev) => ({
      ...prev,
      irJson: irJson || prev.irJson,
      documentId: documentId || prev.documentId,
    }));
  }, []);

  const handleStatusChange = useCallback((isWorking: boolean) => {
    setDocumentState((prev) => ({
      ...prev,
      isAgentWorking: isWorking,
    }));
  }, []);

  const handleArtifactUpdate = useCallback((artifact: Partial<ArtifactState>) => {
    setArtifactState((prev) => ({
      ...prev,
      ...artifact,
      isOpen: true,
    }));
  }, []);

  const handleArtifactClose = useCallback(() => {
    setArtifactState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const handleArtifactReopen = useCallback((irJson?: string) => {
    if (irJson) {
      setDocumentState((prev) => ({ ...prev, irJson }));
    }
    setArtifactState((prev) => ({
      ...prev,
      isOpen: true,
    }));
  }, []);

  return (
    <div className="h-dvh flex flex-col">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Chat Panel — always visible, takes full width when artifact is closed */}
        <ResizablePanel defaultSize={artifactState.isOpen ? 45 : 100} minSize={30}>
          <AgentChat
            id={id}
            initialMessages={initialMessages}
            documentState={documentState}
            onFileUploaded={handleFileUploaded}
            onIRUpdate={handleIRUpdate}
            onStatusChange={handleStatusChange}
            onArtifactUpdate={handleArtifactUpdate}
            onArtifactReopen={handleArtifactReopen}
          />
        </ResizablePanel>

        {/* Artifact Panel — slides in from the right when open */}
        {artifactState.isOpen && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={55} minSize={25}>
              <ArtifactPanel
                artifact={artifactState}
                documentState={documentState}
                onClose={handleArtifactClose}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
