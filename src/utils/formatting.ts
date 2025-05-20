import { EnrichedMessage } from '../types';

/**
 * Format date to readable string with timezone
 * @param date Date object 
 * @returns Formatted date string
 */
export function formatDateWithTime(date: Date): string {
  return date.toLocaleString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Get timestamp for a specific date
 * @param date Date object
 * @returns Unix timestamp string
 */
export function getTimestampForDate(date: Date): string {
  return (date.getTime() / 1000).toString();
}

/**
 * Calculate time difference between two timestamps in minutes
 * @param startTs Start timestamp (Slack format)
 * @param endTs End timestamp (Slack format)
 * @returns Difference in minutes
 */
export function calculateTimeDifference(startTs: string, endTs: string): number {
  const startTime = parseFloat(startTs) * 1000;
  const endTime = parseFloat(endTs) * 1000;
  const diffMs = endTime - startTime;
  return Math.round(diffMs / (1000 * 60));
}

/**
 * Format messages for analysis including threads in a readable format
 * @param messages Array of enriched Slack messages
 * @returns Formatted string for analysis
 */
export function formatMessagesForAnalysis(messages: EnrichedMessage[]): string {
  const threadMap = new Map<string, EnrichedMessage[]>();
  const standaloneMessages: EnrichedMessage[] = [];
  
  messages.forEach(msg => {
    const ts = msg.ts;
    const threadTs = msg.thread_ts;
    
    if (threadTs && threadTs !== ts) {
      if (!threadMap.has(threadTs)) {
        threadMap.set(threadTs, []);
      }
      threadMap.get(threadTs)!.push(msg);
    } else if (!msg.is_reply) {
      standaloneMessages.push(msg);
    }
  });
  
  standaloneMessages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));
  
  threadMap.forEach(replies => {
    replies.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));
  });
  
  let formattedMessages = '';
  
  standaloneMessages.forEach(msg => {
    const userName = msg.userInfo?.realName || 'Unknown User';
    const timestamp = new Date(parseFloat(msg.ts) * 1000);
    const formattedTime = formatDateWithTime(timestamp);
    const text = msg.text || '';
    
    let threadInfo = '';
    if (msg.has_resolution) {
      threadInfo = `\n    [THREAD INFO] Started: ${msg.first_time_formatted} | Resolved: ${msg.resolution_time_formatted} | Resolution Time: ${msg.resolution_time_minutes} minutes | Replies: ${msg.reply_count_actual}`;
    }
    
    formattedMessages += `[${formattedTime}] ${userName}: ${text}${threadInfo}\n\n`;
    
    if (threadMap.has(msg.ts)) {
      const replies = threadMap.get(msg.ts)!;
      replies.forEach(reply => {
        const replyUserName = reply.userInfo?.realName || 'Unknown User';
        const replyTimestamp = new Date(parseFloat(reply.ts) * 1000);
        const replyFormattedTime = formatDateWithTime(replyTimestamp);
        const replyText = reply.text || '';
        
        formattedMessages += `    ↳ [${replyFormattedTime}] ${replyUserName}: ${replyText}\n\n`;
      });
      
      formattedMessages += '---\n\n';
    }
  });
  
  return formattedMessages;
} 