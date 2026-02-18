"use client";

import { UIMessage, isToolUIPart, getToolName } from "ai";
import { memo } from "react";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { ToolResultDisplay } from "./tool-result-display";
import { ThinkingMessage } from "./message";
import { MessageActions, MessageAction } from '@/components/ai-elements/message';
import { CopyIcon, RefreshCcw, Zap, Clock, BrainCircuit } from "lucide-react";
import { toast } from "sonner";
import { TelemetryMetadata } from "../types";

interface MessagesProps {
  isLoading: boolean;
  messages: UIMessage[];
  onRegenerate?: () => void;
}

function PureMessages({
  isLoading,
  messages,
}: MessagesProps) {
  return (
    <>
      {messages.map((message, index) => {
        const textContent = message.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("");

        const telemetry = message.metadata as TelemetryMetadata | undefined;

        return (
          <Message
            key={message.id || index}
            from={message.role === 'user' ? 'user' : 'assistant'}
          >
            <div className="flex flex-col gap-1">
              <MessageContent>
                {message.parts?.map((part, partIndex) => {
                  if (part.type === 'text') {
                    return (
                      <MessageResponse key={`part-${index}-${partIndex}`}>
                        {part.text}
                      </MessageResponse>
                    );
                  }
                  if (isToolUIPart(part)) {
                    return (
                      <div key={part.toolCallId}>
                        <ToolResultDisplay toolCall={part} />
                      </div>
                    );
                  }
                  return null;
                })}
              </MessageContent>
              {message.role === 'assistant' && textContent && (
                <MessageActions className="flex flex-row items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MessageAction
                    onClick={() => {
                      navigator.clipboard.writeText(textContent);
                      toast.success("Copied to clipboard");
                    }}
                    label="Copy"
                  >
                    <CopyIcon className="size-3" />
                  </MessageAction>

                  {telemetry && (
                    <>
                      {telemetry.model && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground border-l pl-2 ml-1">
                          <span>{telemetry.model}</span>
                        </div>
                      )}
                      
                      {telemetry.tokensPerSecond > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Zap className="size-3" />
                          <span>{telemetry.tokensPerSecond} tok/sec</span>
                        </div>
                      )}

                      {telemetry.usage?.totalTokens && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <BrainCircuit className="size-3" />
                          <span>{telemetry.usage.outputTokens} tokens</span>
                        </div>
                      )}

                      {telemetry.timeToFirstToken && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          <span>Time-to-First: {(telemetry.timeToFirstToken / 1000).toFixed(2)} sec</span>
                        </div>
                      )}
                    </>
                  )}
                </MessageActions>
              )}
            </div>
          </Message>
        );
      })}

      {isLoading && messages[messages.length - 1]?.role === 'user' && (
        <ThinkingMessage />
      )}
    </>
  );
}

export const Messages = memo(PureMessages);