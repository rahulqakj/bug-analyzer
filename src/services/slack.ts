import { WebClient } from '@slack/web-api';
import { EnrichedMessage, UserInfo } from '../types';
import config from '../config';
import { calculateTimeDifference, formatDateWithTime, getTimestampForDate } from '../utils/formatting';

const slackClient = new WebClient(config.slack.token);

/**
 * Retrieve messages from a Slack channel within a specific date range including all replies
 * @returns Array of message objects with replies
 */
export async function getChannelMessages(): Promise<EnrichedMessage[]> {
  try {
    let startDate: Date;
    let endDate: Date;
    
    if (config.slack.startDate && config.slack.endDate) {
      startDate = new Date(config.slack.startDate);
      endDate = new Date(config.slack.endDate);
      console.log(`Using date range from config: ${formatDateWithTime(startDate)} to ${formatDateWithTime(endDate)}`);
    } else {
      const currentYear = new Date().getFullYear();
      startDate = new Date(currentYear, new Date().getMonth() - 1, 1);
      endDate = new Date(currentYear, new Date().getMonth(), 0);
      
      if (endDate > new Date()) {
        startDate.setFullYear(currentYear - 1);
        endDate.setFullYear(currentYear - 1);
      }
    }
    
    const startTimestamp = getTimestampForDate(startDate);
    const endTimestamp = getTimestampForDate(endDate);
    
    console.log(`Fetching messages from channel ${config.slack.channelId}`);
    console.log(`Date range: ${formatDateWithTime(startDate)} to ${formatDateWithTime(endDate)}`);
    console.log(`Timestamps: ${startTimestamp} to ${endTimestamp}`);
    
    const allMessages: EnrichedMessage[] = [];
    let cursor: string | undefined;
    
    do {
      const response = await slackClient.conversations.history({
        channel: config.slack.channelId,
        oldest: startTimestamp,
        latest: endTimestamp,
        limit: 100,
        cursor: cursor,
        inclusive: true
      });
      
      if (response.messages && response.messages.length > 0) {
        const messages = response.messages as unknown as EnrichedMessage[];
        allMessages.push(...messages);
      }
      
      cursor = response.response_metadata?.next_cursor;
      
      console.log(`Retrieved ${allMessages.length} messages so far...`);
      
    } while (cursor);
    
    console.log(`Total messages retrieved: ${allMessages.length}`);
    
    console.log('Fetching replies for messages with threads...');
    const messagesWithReplies = await fetchAllReplies(allMessages);
    
    console.log(`Finished fetching replies. Total messages including replies: ${messagesWithReplies.length}`);
    
    return await enrichMessagesWithUserInfo(messagesWithReplies);
    
  } catch (error) {
    console.error('Error fetching Slack messages:', error);
    return [];
  }
}

/**
 * Fetch all replies for messages that have threads
 * @param messages Array of parent messages
 * @returns Messages with replies included as nested objects
 */
async function fetchAllReplies(messages: EnrichedMessage[]): Promise<EnrichedMessage[]> {
  const allMessages = [...messages];
  let threadsProcessed = 0;

  const messagesWithThreads = messages.filter(msg => msg.thread_ts && msg.reply_count && msg.reply_count > 0);
  console.log(`Found ${messagesWithThreads.length} messages with threads`);
  
  for (const message of messagesWithThreads) {
    try {
      const threadTs = message.thread_ts;
      if (!threadTs) continue;
      
      let cursor: string | undefined;
      const replies: EnrichedMessage[] = [];
      
      do {
        const threadResponse = await slackClient.conversations.replies({
          channel: config.slack.channelId,
          ts: threadTs,
          limit: 1000,
          cursor: cursor,
        });
        
        if (threadResponse.messages && threadResponse.messages.length > 0) {
          const threadMessages = threadResponse.messages as unknown as EnrichedMessage[];
          
          if (threadMessages[0].ts === threadTs) {
            const newReplies = threadMessages.slice(1);
            replies.push(...newReplies);
          } else {
            replies.push(...threadMessages);
          }
        }
        
        cursor = threadResponse.response_metadata?.next_cursor;
        
      } while (cursor);
      
      for (const reply of replies) {
        reply.is_reply = true;
        reply.parent_ts = threadTs;

        allMessages.push(reply);
      }
      
      if (replies.length > 0) {
        const parentMsg = allMessages.find(msg => msg.ts === threadTs);
        if (parentMsg) {
          const sortedReplies = [...replies].sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));
          
          const firstTs = threadTs;
          const lastTs = sortedReplies[sortedReplies.length - 1].ts;
          const resolutionTimeMinutes = calculateTimeDifference(firstTs, lastTs);
          
          parentMsg.has_resolution = true;
          parentMsg.resolution_time_minutes = resolutionTimeMinutes;
          parentMsg.resolution_ts = lastTs;
          parentMsg.first_ts = firstTs;
          parentMsg.reply_count_actual = replies.length;
          
          parentMsg.first_time_formatted = formatDateWithTime(new Date(parseFloat(firstTs) * 1000));
          parentMsg.resolution_time_formatted = formatDateWithTime(new Date(parseFloat(lastTs) * 1000));
        }
      }
      
      threadsProcessed++;
      if (threadsProcessed % 10 === 0) {
        console.log(`Processed ${threadsProcessed}/${messagesWithThreads.length} threads...`);
      }
      
    } catch (error) {
      console.error(`Error fetching replies for message:`, error);
    }
  }
  
  return allMessages;
}

/**
 * Add user information to messages
 * @param messages Array of Slack messages
 * @returns Messages with user information
 */
async function enrichMessagesWithUserInfo(messages: EnrichedMessage[]): Promise<EnrichedMessage[]> {
  try {
    const userIds = new Set<string>();
    messages.forEach(message => {
      if (message.user) {
        userIds.add(message.user);
      }
    });
    
    console.log(`Fetching info for ${userIds.size} unique users...`);
    
    const userInfo: Record<string, UserInfo> = {};
    let processedUsers = 0;
    
    for (const userId of userIds) {
      try {
        const userResponse = await slackClient.users.info({ user: userId });
        if (userResponse.user) {
          const user = userResponse.user as any;
          
          userInfo[userId] = {
            realName: user.real_name || 'Unknown',
            displayName: user.profile?.display_name || 'Unknown',
            isBot: user.is_bot || false,
            title: user.profile?.title || '',
            email: user.profile?.email || '',
          };
        }
      } catch (error) {
        console.warn(`Could not fetch info for user ${userId}:`, error);
        userInfo[userId] = { 
          realName: 'Unknown', 
          displayName: 'Unknown', 
          isBot: false,
          title: '',
          email: ''
        };
      }
      
      processedUsers++;
      if (processedUsers % 10 === 0) {
        console.log(`Processed ${processedUsers}/${userIds.size} users...`);
      }
    }
    
    return messages.map(message => {
      if (message.user && userInfo[message.user]) {
        return {
          ...message,
          userInfo: userInfo[message.user],
        };
      }
      return message;
    });
    
  } catch (error) {
    console.error('Error enriching messages with user info:', error);
    return messages;
  }
}