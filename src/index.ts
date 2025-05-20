import { getChannelMessages } from './services/slack';
import { analyzeMessages } from './services/ai';
import { formatMessagesForAnalysis } from './utils/formatting';
import { saveRawMessagesToFile } from './utils/file';
import config from './config';

function parseArgs(): { analyze: boolean } {
  const args = process.argv.slice(2);
  
  const options = {
    analyze: true
  };

  args.forEach(arg => {
    if (arg === '--no-analysis' || arg === '-na') {
      options.analyze = false;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: npm run analyze-slack [options]

Options:
  --no-analysis, -na   Skip AI analysis, just fetch messages
  --help, -h           Show this help message
      `);
      process.exit(0);
    }
  });
  
  return options;
}


async function main(): Promise<void> {
  try {
    const options = parseArgs();
    
    console.log('Starting Slack bug report analyzer...');
    console.log(`Target channel: ${config.slack.channelId}`);
    console.log(`Output directory: ${config.outputDir}`);
    
    const messages = await getChannelMessages();
    
    if (messages.length === 0) {
      console.log('No messages found for the specified time period.');
      return;
    }
    
    console.log('Formatting messages for analysis...');
    const formattedMessages = formatMessagesForAnalysis(messages);
    
    console.log('Saving raw messages to file...');
    const rawMessagesFile = await saveRawMessagesToFile(formattedMessages);
    
    console.log('\n======================================================');
    console.log(`Retrieved ${messages.length} messages (including replies)`);
    console.log(`Raw messages saved to ${rawMessagesFile}`);
    console.log('Please check the raw messages file to verify the content is correct.');
    console.log('======================================================\n');
    
    if (!options.analyze) {
      console.log('Skipping analysis as requested.');
      return;
    }
    
    console.log('Starting analysis process with batching...');
    const _analysis = await analyzeMessages(formattedMessages);
    
    console.log('\n======================================================');
    console.log('Bug analysis completed successfully!');
    console.log('======================================================\n');
    
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export default main; 