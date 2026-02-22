"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { useState, useRef, useEffect, useCallback } from "react";
import { Messages } from "@/app/agent/components/messages";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  PromptInputHeader,
  PromptInputAttachments,
  PromptInputAttachment,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { uploadChatAttachment } from "@/lib/supabase/upload-chat-attachment";
import type { FileUIPart } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { FileTextIcon, PanelLeftIcon, WandIcon } from "lucide-react";
import { toast } from "sonner";
import { generateUUID } from "@/app/agent/lib/utils/generate-uuid";
import { useModelSelection } from "@/app/agent/hooks/use-model-selection";
import { ModelSelector } from "@/app/agent/components/model-selector";
import type { DocumentState } from "./agent-view";
import type { ArtifactState } from "../types";
import { useSidebar } from "@/components/ui/sidebar";

interface AgentChatProps {
  id: string;
  initialMessages?: UIMessage[];
  documentState: DocumentState;
  onFileUploaded: (filePath: string, fileName: string) => void;
  onIRUpdate: (irJson: string, documentId?: string) => void;
  onStatusChange: (isWorking: boolean) => void;
  onArtifactUpdate: (artifact: Partial<ArtifactState>) => void;
  onArtifactReopen: (irJson?: string) => void;
}

export function AgentChat({
  id,
  initialMessages = [],
  documentState,
  onFileUploaded,
  onIRUpdate,
  onStatusChange,
  onArtifactUpdate,
  onArtifactReopen,
}: AgentChatProps) {
  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { selectedModel, handleModelChange } = useModelSelection();
  const { toggleSidebar } = useSidebar();

  const { messages, status, sendMessage } = useChat({
    messages: initialMessages,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: "/api/agent",
    }),
    onError: (error) => {
      console.error("Agent error:", error);
      toast.error("Agent error", { description: error.message });
    },
  });

  // Update URL to include conversation ID after first message
  useEffect(() => {
    if (messages.length > 0 && !window.location.pathname.includes(id)) {
      window.history.replaceState({}, "", `/agent/${id}`);
    }
  }, [id, messages]);

  // Propagate chat status to parent for document panel state
  useEffect(() => {
    const isWorking = status === "submitted" || status === "streaming";
    onStatusChange(isWorking);
  }, [status, onStatusChange]);

  // Unwrap MCP content format: {content: [{type:"text", text:"..."}]} → parsed JSON
  const unwrapMCPOutput = useCallback((output: any): any => {
    if (!output) return output;

    let data = output;
    // If it's a string, try parsing it
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch { return output; }
    }

    // MCP tools return {content: [{type:"text", text:"..."}]}
    if (data?.content && Array.isArray(data.content)) {
      const textParts = data.content
        .filter((item: any) => item.type === "text" && item.text)
        .map((item: any) => item.text);
      if (textParts.length > 0) {
        const joined = textParts.join("");
        try { return JSON.parse(joined); } catch { return joined; }
      }
    }

    return data;
  }, []);

  // Watch for IR updates and artifact tool calls in assistant messages
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "assistant") return;

    for (const part of lastMessage.parts) {
      // Static tool: show_artifact — for non-document types (code, markdown, etc.)
      if (
        part.type === "tool-show_artifact" &&
        (part.state === "output-available" || part.state === "input-available")
      ) {
        const input = (part as any).input;
        if (input && input.type !== 'document') {
          onArtifactUpdate({
            title: input.title,
            displayType: input.type || 'document',
            identifier: input.identifier,
          });
        }
      }

      // In AI SDK v6, MCP tool parts have type 'dynamic-tool'
      // and state 'output-available' when complete
      if (
        part.type === "dynamic-tool" &&
        part.state === "output-available" &&
        part.output != null
      ) {
        const toolName = part.toolName || "";
        const output = unwrapMCPOutput(part.output);

        // convert_document returns document_id — store it
        if (toolName.includes("convert_document") && output?.document_id) {
          onIRUpdate("", output.document_id);
        }

        // read_ir or get_ir_json returns the full IR for the frontend viewer
        // Auto-open the document panel when IR data with blocks arrives
        if (toolName.includes("get_ir_json") || toolName.includes("read_ir")) {
          let irData: any = null;

          if (output?.blocks) {
            irData = output;
          } else if (typeof output === "string") {
            try {
              const parsed = JSON.parse(output);
              if (parsed.blocks) irData = parsed;
            } catch {
              // Not JSON IR, skip
            }
          }

          if (irData) {
            const docId = irData.document_id || documentState.documentId;
            onIRUpdate(JSON.stringify(irData), docId);
            // Auto-trigger document panel
            onArtifactUpdate({
              title: 'Document Viewer',
              displayType: 'document',
              identifier: docId,
            });
          }
        }

        // edit/add/delete return {success, document_id} — re-fetch IR
        if (
          (toolName.includes("edit_ir_block") ||
           toolName.includes("add_ir_block") ||
           toolName.includes("delete_ir_block")) &&
          output?.success
        ) {
          if (output.document_id || documentState.documentId) {
            onIRUpdate("", output.document_id || documentState.documentId);
          }
        }
      }
    }
  }, [messages, onIRUpdate, onArtifactUpdate, unwrapMCPOutput, documentState.documentId]);

  const handleSubmit = useCallback(
    async (promptMessage: PromptInputMessage) => {
      const content = input.trim();
      const hasText = Boolean(content);
      const hasAttachments = Boolean(promptMessage.files?.length);

      if (!hasText && !hasAttachments) return;

      let uploadedFiles: FileUIPart[] = [];

      if (hasAttachments && promptMessage.files) {
        setIsUploading(true);
        try {
          const uploadPromises = promptMessage.files.map(async (fileUIPart) => {
            if (!fileUIPart.url) {
              throw new Error("File URL is missing");
            }
            const response = await fetch(fileUIPart.url);
            const blob = await response.blob();
            const file = new File([blob], fileUIPart.filename || "attachment", {
              type: fileUIPart.mediaType || blob.type,
            });
            return uploadChatAttachment(id, file);
          });
          uploadedFiles = await Promise.all(uploadPromises);

          if (uploadedFiles.length > 0 && uploadedFiles[0].url) {
            onFileUploaded(uploadedFiles[0].url, uploadedFiles[0].filename || "attachment");
          }
        } catch (error) {
          console.error("Error uploading attachments:", error);
          toast.error("Failed to upload attachments");
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      const parts: any[] = [];
      if (content || !hasAttachments) {
        parts.push({ type: "text", text: content || "Sent with attachments" });
      }
      uploadedFiles.forEach(file => {
        parts.push(file);
      });

      sendMessage(
        { parts },
        {
          body: {
            model: selectedModel,
            conversationID: id,
            documentContext: {
              filePath: (uploadedFiles.length > 0 ? uploadedFiles[0].url : undefined) || documentState.documentUrl,
              documentId: documentState.documentId,
            },
            attachments: uploadedFiles,
          },
        }
      );

      setInput("");
    },
    [input, id, documentState, selectedModel, sendMessage, onFileUploaded]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  return (
    <div className="flex h-full min-w-0 flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <button
          onClick={() => toggleSidebar()}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <PanelLeftIcon className="size-4" />
        </button>
        <FileTextIcon className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Document Agent</h2>
        <div className="ml-auto flex items-center gap-2">
          {documentState.documentName && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              {documentState.documentName}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto flex min-w-0 max-w-3xl flex-col gap-4 px-2 py-4 md:gap-6 md:px-4">
          {messages.length === 0 && status !== "streaming" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 pt-20">
              <div className="rounded-full bg-muted p-4">
                <FileTextIcon className="size-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">Document Agent</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                  Upload a PDF to get started. I&apos;ll convert it to an
                  editable IR, then you can ask me to make changes.
                </p>
              </div>
            </div>
          )}
          <Messages
            isLoading={status === "submitted" || status === "streaming"}
            messages={messages}
            onArtifactReopen={onArtifactReopen}
          />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input */}
      <div className="sticky bottom-0 z-10 mx-auto flex w-full max-w-3xl flex-col gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
        <PromptInput onSubmit={handleSubmit} className="border-border w-full" globalDrop multiple>
          <PromptInputHeader className="p-0">
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
          </PromptInputHeader>
          <PromptInputBody>
            <PromptInputTextarea
              onChange={handleInputChange}
              value={input}
              placeholder={
                documentState.irJson
                  ? "Ask me to edit the document..."
                  : "Upload a document or ask a question..."
              }
              name="message"
              disabled={isUploading || status === "streaming" || status === "submitted"}
              autoFocus
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputButton
                onClick={() => setInput("Please convert the attached document to IR and show me its structure.")}
                title="Convert Document"
              >
                <WandIcon className="size-4" />
              </PromptInputButton>
              
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>

              <ModelSelector
                key={selectedModel}
                selectedModelId={selectedModel}
                onModelChange={handleModelChange}
              />
            </PromptInputTools>
            <PromptInputSubmit
              disabled={(!input && status !== "streaming") || isUploading}
              status={
                isUploading || status === "streaming" || status === "submitted"
                  ? "streaming"
                  : "ready"
              }
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
