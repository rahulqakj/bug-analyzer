import fs from 'fs/promises';
import path from 'path';
import config from '../config';

/**
 * Save analysis results to a file
 * @param analysis Analysis text
 * @param filename Base filename without extension
 * @param extension File extension (default: 'md')
 * @returns Full path to the saved file
 */
export async function saveAnalysisToFile(
  analysis: string, 
  filename: string = 'bug-analysis', 
  extension: string = 'md'
): Promise<string> {
  try {
    await fs.mkdir(config.outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fullFilename = `${filename}-${timestamp}.${extension}`;
    const filePath = path.join(config.outputDir, fullFilename);
    
    await fs.writeFile(filePath, analysis);
    console.log(`Analysis saved to ${filePath}`);
    
    return filePath;
  } catch (error: any) {
    console.error('Error saving analysis to file:', error);
    throw new Error(`Failed to save analysis: ${error.message}`);
  }
}

/**
 * Save raw messages to file for review
 * @param formattedMessages Formatted message content 
 * @returns Path to the saved file
 */
export async function saveRawMessagesToFile(formattedMessages: string): Promise<string> {
  try {
    // Create raw-messages directory
    const rawMessagesDir = path.join(config.outputDir, 'raw-messages');
    await fs.mkdir(rawMessagesDir, { recursive: true });
    
    // Get current date in YYYY-MM-DD format
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const filename = `raw-slack-messages-${dateStr}.txt`;
    const filePath = path.join(rawMessagesDir, filename);
    
    await fs.writeFile(filePath, formattedMessages);
    console.log(`Raw messages saved to ${filePath}`);
    
    return filePath;
  } catch (error: any) {
    console.error('Error saving raw messages to file:', error);
    throw new Error(`Failed to save raw messages: ${error.message}`);
  }
} 