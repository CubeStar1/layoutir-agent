
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

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  raw_content?: string;
}

export interface TavilySearchResponse {
  answer?: string;
  query: string;
  response_time: number;
  results: TavilySearchResult[];
  images?: { url: string; description: string }[];
}
