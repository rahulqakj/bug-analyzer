import dotenv from 'dotenv';
import path from 'path';
import { AppConfig } from './types';

dotenv.config();

const requiredEnvVars = ['SLACK_BOT_TOKEN', 'SLACK_CHANNEL_ID', 'DEEPSEEK_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const config: AppConfig = {
  slack: {
    token: process.env.SLACK_BOT_TOKEN!,
    channelId: process.env.SLACK_CHANNEL_ID!,
    startDate: process.env.SLACK_START_DATE,
    endDate: process.env.SLACK_END_DATE
  },
  ai: {
    apiKey: process.env.DEEPSEEK_API_KEY!,
    baseURL: 'https://api.deepseek.com/v1',
    model: process.env.AI_MODEL || 'deepseek-chat',
    maxInputTokens: 100000,
    maxOutputTokens: 8192
  },
  outputDir: process.env.OUTPUT_DIR || path.join(process.cwd(), 'results')
};

export default config; 