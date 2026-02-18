"use client";

import { useChat } from '@ai-sdk/react';
import { Messages } from "./messages";
import { ChatHeader } from "./chat-header";
import { UIMessage } from "ai";
import { useState, useEffect, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { defaultModel } from "@/app/chat/lib/ai/models";
import {
  PromptInput,

  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input';
import { GlobeIcon, MicIcon } from 'lucide-react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { generateUUID } from '../lib/utils/generate-uuid';
import { useChatHistory } from '../hooks/use-chat-history';
import { AppUsage } from '../types';
import { Context } from '@/components/ai-elements/context';
import { Greeting } from './greeeting';
import { ModelSelector } from './model-selector';
import { useApiKeys } from '../hooks/use-api-keys';
import { useModelSelection } from '../hooks/use-model-selection';
import { SuggestedActions } from './suggested-actions';

interface ChatProps {
  id: string;
  initialMessages?: UIMessage[];
  initialLastContext?: AppUsage;
}

export function Chat({ id, initialMessages = [], initialLastContext }: ChatProps) {
  const { selectedModel, handleModelChange } = useModelSelection();
  const [input, setInput] = useState("");
  const [usage, setUsage] = useState<AppUsage | undefined>(initialLastContext);
  const queryClient = useQueryClient();
  const { addOptimisticChat } = useChatHistory();
  const shouldInvalidateHistory = useRef(initialMessages.length === 0);
  const { apiKeys } = useApiKeys();

  const { messages, status, sendMessage, regenerate } = useChat({

    messages: initialMessages,
    generateId: generateUUID,
    onError: async (error) => {
      console.error("Error fetching response:", error);
    },
    onFinish: () => {
      if (shouldInvalidateHistory.current) {
        queryClient.invalidateQueries({ queryKey: ["chat-history"] });
        shouldInvalidateHistory.current = false;
      }
    },
    onData: (dataPart: any) => {
      if (dataPart && typeof dataPart === 'object' && dataPart.type === 'data-usage') {
        setUsage(dataPart.data);
      }
    },
  });

  const contextProps = useMemo(
    () => ({
      usage,
    }),
    [usage]
  );

  useEffect(() => {
    if (messages.length > 0 && !window.location.pathname.includes(id)) {
      window.history.replaceState({}, "", `/chat/${id}`);
    }
  }, [id, messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handlePromptSubmit = (promptMessage: PromptInputMessage) => {
    const content = input.trim();
    if (!content) return;

    if (messages.length === 0) {
      addOptimisticChat(id, content);
    }

    sendMessage(
      { parts: [{ type: 'text', text: content }] },
      {
        body: {
          model: selectedModel,
          conversationID: id,
          apiKeys,
        },
      }
    );


    setInput('');
  };

  const handleSuggestedAction = (action: string) => {
    if (messages.length === 0) {
      addOptimisticChat(id, action);
    }
    sendMessage(
      { parts: [{ type: 'text', text: action }] },
      {
        body: {
          model: selectedModel,
          conversationID: id,
          apiKeys,
        },
      }
    );
  };


  return (
    <div className="overscroll-behavior-contain -webkit-overflow-scrolling-touch flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
      <ChatHeader chatId={id} />
      
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto flex min-w-0 max-w-3xl flex-col gap-4 px-2 py-4 md:gap-6 md:px-4">
          {messages.length === 0 && status !== 'streaming' && (
            <>
              <Greeting />              
            </>
          )}
          <Messages
            isLoading={status === 'submitted' || status === 'streaming'}
            messages={messages}
            onRegenerate={regenerate}
          />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="sticky bottom-0 z-1 mx-auto flex flex-col w-full max-w-3xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
        {messages.length === 0 && status !== 'streaming' && (
          <SuggestedActions chatId={id} onSuggestedAction={handleSuggestedAction} />
        )}

        <PromptInput 
            onSubmit={handlePromptSubmit} 
            className="border-border w-full"
        >
            <PromptInputBody>
                <PromptInputTextarea
                    onChange={handleInputChange}
                    value={input}
                    placeholder="Send a message..."
                    name="message"
                    autoFocus
                />

            </PromptInputBody>
            <PromptInputFooter>
                <PromptInputTools>
                <ModelSelector
                    key={selectedModel}
                    selectedModelId={selectedModel}
                    onModelChange={handleModelChange}
                />
                </PromptInputTools>

                <div className="flex items-center gap-2">
                  {usage && (
                    <Context {...contextProps} />
                  )}
                  <PromptInputSubmit disabled={!input} status={status === 'streaming' || status === 'submitted' ? 'streaming' : 'ready'} /> 
                </div>
            </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

