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
  documentUrl?: string;
  documentName?: string;
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

  // Extract initial state from chat history if available
  // This allows the document state to persist across page reloads
  useState(() => {
    if (!initialMessages || initialMessages.length === 0) return;

    let initialDocState: DocumentState = {};
    let shouldOpenArtifact = false;

    // 1. Scan forwards to find the document URL from user uploads
    for (const msg of initialMessages) {
      if (msg.role === "user" && msg.parts) {
        for (const part of msg.parts) {
          if (part.type === "file" && part.url) {
            initialDocState.documentUrl = part.url;
            initialDocState.documentName = part.filename || "Document";
          }
        }
      }
    }

    // 2. Scan backwards to find the latest valid IR JSON and documentId
    for (let i = initialMessages.length - 1; i >= 0; i--) {
      const msg = initialMessages[i];
      if (msg.role === "assistant" && msg.parts) {
        let foundIr = false;
        for (const part of msg.parts) {
          if (
            part.type === "dynamic-tool" &&
            part.state === "output-available" &&
            (part.toolName.includes("get_ir_json") || part.toolName.includes("read_ir")) &&
            part.output
          ) {
            let output = part.output as any;
            if (typeof output === "string") {
              try { output = JSON.parse(output); } catch {}
            }
            if (output?.blocks) {
              initialDocState.irJson = typeof part.output === "string" ? part.output : JSON.stringify(output);
              if (output.document_id) {
                initialDocState.documentId = output.document_id;
              }
              foundIr = true;
              break;
            }
          } else if (
            part.type === "dynamic-tool" &&
            part.state === "output-available" &&
            part.toolName.includes("convert_document") &&
            part.output
          ) {
            // Also grab documentId if convert happened but get_ir_json hasn't run yet
            let output = part.output as any;
            if (typeof output === "string") {
               try { output = JSON.parse(output); } catch {}
            }
            if (output?.document_id && !initialDocState.documentId) {
               initialDocState.documentId = output.document_id;
            }
          }
        }
        if (foundIr) {
          shouldOpenArtifact = true;
          break; // Found the latest IR, stop searching backwards
        }
      }
    }

    if (Object.keys(initialDocState).length > 0) {
      setDocumentState(initialDocState);
    }
    if (shouldOpenArtifact) {
      setArtifactState((prev) => ({
        ...prev,
        isOpen: true,
        identifier: initialDocState.documentId,
      }));
    }
  });

  const handleFileUploaded = useCallback(
    (documentUrl: string, documentName: string) => {
      setDocumentState((prev) => ({ ...prev, documentUrl, documentName }));
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
