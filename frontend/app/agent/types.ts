
import { LanguageModelUsage } from "ai";
import { UsageData } from "tokenlens/helpers";

export type AppUsage = LanguageModelUsage & UsageData & { modelId?: string };

export interface TelemetryMetadata {
  timeToFirstToken: number | null;
  tokensPerSecond: number;
  duration: number;
  usage?: {
      inputTokens: number
      outputTokens: number
      totalTokens: number
      reasoningTokens?: number | undefined
      cachedInputTokens?: number | undefined
  };
  model?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  updated_at: string;
  created_at: string;
  lastContext?: AppUsage;
}

export interface Message {
  id: string;
  role: string;
  parts: any[];
  created_at: string;
  metadata?: TelemetryMetadata;
}

export type ArtifactDisplayType = 'document' | 'code' | 'markdown' | 'custom'

export interface ArtifactState {
  isOpen: boolean
  title?: string
  displayType: ArtifactDisplayType
  content?: string
  identifier?: string
  ui?: React.ReactNode // Canvas UI payload
}

export interface DocumentState {
  documentUrl?: string; // e.g. /api/agent/file?path=...
  documentName?: string;
  documentId?: string; // Server tracking ID
  isAgentWorking?: boolean; // Whether the bot is processing/typing
}
