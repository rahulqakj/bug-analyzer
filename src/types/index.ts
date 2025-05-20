export interface UserInfo {
  realName: string;
  displayName: string;
  isBot: boolean;
  title: string;
  email: string;
}

export interface EnrichedMessage {
  ts: string;
  thread_ts?: string;
  text?: string;
  user?: string;
  userInfo?: UserInfo;
  is_reply?: boolean;
  parent_ts?: string;
  has_resolution?: boolean;
  resolution_time_minutes?: number;
  resolution_ts?: string;
  first_ts?: string;
  first_time_formatted?: string;
  resolution_time_formatted?: string;
  reply_count?: number;
  reply_count_actual?: number;
}

export interface AIModelConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
  maxInputTokens?: number;
  maxOutputTokens?: number;
}

export interface SlackConfig {
  token: string;
  channelId: string;
  startDate?: string;
  endDate?: string;
}

export interface AppConfig {
  slack: SlackConfig;
  ai: AIModelConfig;
  outputDir: string;
} 