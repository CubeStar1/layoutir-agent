"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { useState, useRef, useEffect, useCallback } from "react";
import { Messages } from "@/app/chat/components/messages";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { UploadIcon, FileTextIcon } from "lucide-react";
import { toast } from "sonner";
import { generateUUID } from "@/app/chat/lib/utils/generate-uuid";
import { useModelSelection } from "@/app/chat/hooks/use-model-selection";
import { ModelSelector } from "@/app/chat/components/model-selector";
import type { DocumentState } from "./agent-view";

interface AgentChatProps {
  id: string;
  initialMessages?: UIMessage[];
  documentState: DocumentState;
  onFileUploaded: (filePath: string, fileName: string) => void;
  onIRUpdate: (irJson: string, documentId?: string) => void;
  onStatusChange: (isWorking: boolean) => void;
}

export function AgentChat({
  id,
  initialMessages = [],
  documentState,
  onFileUploaded,
  onIRUpdate,
  onStatusChange,
}: AgentChatProps) {
  const [input, setInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { selectedModel, handleModelChange } = useModelSelection();

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

  // Watch for IR updates in tool results from assistant messages
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "assistant") return;

    for (const part of lastMessage.parts) {
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
        if (toolName.includes("get_ir_json") || toolName.includes("read_ir")) {
          if (output?.blocks) {
            onIRUpdate(JSON.stringify(output), output.document_id);
          } else if (typeof output === "string") {
            try {
              const parsed = JSON.parse(output);
              if (parsed.blocks) {
                onIRUpdate(JSON.stringify(parsed), parsed.document_id);
              }
            } catch {
              // Not JSON IR, skip
            }
          }
        }

        // edit/add/delete return {success, document_id} — re-fetch IR
        if (
          (toolName.includes("edit_ir_block") ||
           toolName.includes("add_ir_block") ||
           toolName.includes("delete_ir_block")) &&
          output?.success
        ) {
          if (output.document_id) {
            onIRUpdate("", output.document_id);
          }
        }
      }
    }
  }, [messages, onIRUpdate, unwrapMCPOutput]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const uploadToast = toast.loading("Uploading file...", {
        description: file.name,
      });

      try {
        const response = await fetch("/api/agent/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");

        const data = await response.json();
        onFileUploaded(data.filePath, data.fileName);

        toast.success("File uploaded!", {
          id: uploadToast,
          description: `${file.name} ready for processing`,
        });

        // Auto-send a message to convert the document
        sendMessage(
          {
            parts: [
              {
                type: "text",
                text: `I've uploaded a document: ${file.name}. Please convert it to IR and show me its structure.`,
              },
            ],
          },
          {
            body: {
              model: selectedModel,
              conversationID: id,
              documentContext: {
                filePath: data.filePath,
              },
            },
          }
        );
      } catch (error: any) {
        toast.error("Upload failed", {
          id: uploadToast,
          description: error.message,
        });
      }
    },
    [id, onFileUploaded, sendMessage]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file);
      e.target.value = "";
    },
    [handleFileUpload]
  );

  const handleSubmit = useCallback(
    (_promptMessage: PromptInputMessage) => {
      const content = input.trim();
      if (!content) return;

      sendMessage(
        { parts: [{ type: "text", text: content }] },
        {
          body: {
            model: selectedModel,
            conversationID: id,
            documentContext: {
              filePath: documentState.filePath,
              documentId: documentState.documentId,
            },
          },
        }
      );

      setInput("");
    },
    [input, id, documentState, selectedModel, sendMessage]
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
        <FileTextIcon className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Document Agent</h2>
        {documentState.fileName && (
          <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {documentState.fileName}
          </span>
        )}
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
          />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input */}
      <div className="sticky bottom-0 z-10 mx-auto flex w-full max-w-3xl flex-col gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
        <PromptInput onSubmit={handleSubmit} className="border-border w-full">
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
              autoFocus
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputButton
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon className="size-4" />
              </PromptInputButton>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <ModelSelector
                key={selectedModel}
                selectedModelId={selectedModel}
                onModelChange={handleModelChange}
              />
            </PromptInputTools>
            <PromptInputSubmit
              disabled={!input}
              status={
                status === "streaming" || status === "submitted"
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
