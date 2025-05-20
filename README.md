# Slack Bug Report Analyzer

A simple tool that analyzes Slack bug report channels and generates comprehensive insights using AI.

## Features

- Fetches messages from a Slack bug report channel
- Analyzes conversation threads to extract bug information
- Tracks resolution times and statistics
- Identifies common bug patterns and trends
- Generates detailed reports with AI-powered insights
- Supports custom date ranges for analysis
- **Optimized with conversation-style batching** for processing messages
- Handles large message volumes efficiently
- **Organized file output** with date-stamped files in dedicated folders

## Project Structure

```
.
├── src/
│   ├── services/        # External service integrations
│   │   ├── slack.ts     # Slack API integration
│   │   └── ai.ts        # AI service integration (DeepSeek)
│   ├── types/           # TypeScript type definitions
│   │   └── index.ts     # Application interface definitions
│   ├── utils/           # Utility functions
│   │   ├── formatting.ts # Message formatting utilities
│   │   ├── file.ts      # File I/O operations
│   │   └── retry.ts     # API retry mechanism
│   ├── config.ts        # Application configuration
│   └── index.ts         # Main entry point
├── results/             # Output directory for analysis results
│   ├── raw-messages/    # Extracted Slack messages
│   ├── conversation-batches/ # AI conversation inputs
│   └── final-reports/   # Generated analysis reports
├── .env                 # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd slack-bug-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=C0123456789
DEEPSEEK_API_KEY=your-deepseek-api-key
AI_MODEL=deepseek-chat
SLACK_START_DATE=2023-06-01
SLACK_END_DATE=2023-06-30
OUTPUT_DIR=./results
```

## Usage

### Build the project
```bash
npm run build
```

### Run the analyzer
```bash
npm run analyze-slack
```

### Run without analysis (fetch only)
```bash
npm run fetch-only
```

### Development mode
```bash
npm run dev
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SLACK_BOT_TOKEN` | Slack Bot Token with conversation access | Yes |
| `SLACK_CHANNEL_ID` | ID of the bug report channel to analyze | Yes |
| `DEEPSEEK_API_KEY` | DeepSeek AI API key | Yes |
| `AI_MODEL` | LLM model to use (default: deepseek-chat) | No |
| `SLACK_START_DATE` | Start date for message retrieval (YYYY-MM-DD) | No |
| `SLACK_END_DATE` | End date for message retrieval (YYYY-MM-DD) | No |
| `OUTPUT_DIR` | Directory for saving results (default: ./results) | No |

## Analysis Process

This analyzer follows a streamlined process to extract insights from Slack messages:

1. **Data Retrieval**: Fetches messages from the specified Slack channel, including all thread replies
2. **User Enrichment**: Adds user profile information to each message
3. **Thread Processing**: Analyzes conversation threads to identify bug reports and resolutions
4. **AI Analysis**: Sends formatted conversation to DeepSeek AI for in-depth analysis
5. **Report Generation**: Creates a comprehensive report with insights and recommendations

## Conversation-Style Processing

This analyzer implements a conversation-style processing approach that handles Slack messages efficiently:

1. Loads all Slack messages into a single conversation
2. Preserves the context and flow of discussions
3. Processes messages in a conversational format for the LLM
4. Maintains message relationships for better analysis

This approach provides several advantages:

- **Full Context Understanding**: The LLM can see all messages in their original context
- **Better Pattern Recognition**: Relationships between messages are preserved
- **Simplified Processing**: No need for complex chunking and reassembly
- **Higher Quality Analysis**: More accurate insights from complete conversations

## Output Files

The analyzer organizes all output files into dedicated folders with dated filenames:

### Raw Messages
- Location: `results/raw-messages/`
- Format: `raw-slack-messages-YYYY-MM-DD.txt`
- Contains the complete set of Slack messages retrieved from the channel
- Includes all thread replies and user information

### Conversation Batches
- Location: `results/conversation-batches/`
- Format: `conversation-batches-YYYY-MM-DD.json`
- Contains the full conversation sent to the AI for analysis
- Includes system prompt and message content

### Final Reports
- Location: `results/final-reports/`
- Format: `final_report-YYYY-MM-DD.md`
- Contains the comprehensive bug analysis report in markdown format
- Structured with sections for different aspects of bug analysis

## Report Sections

The generated report includes detailed analysis across multiple sections:

1. **Executive Summary**: Overview of key findings and statistics
2. **Bug Reports**: Analysis of reported bugs, categorized by type and severity
3. **Bug Resolution**: Command usage patterns and effectiveness
4. **Resolution Time**: Analysis of bug fix duration and factors affecting it
5. **Bug Reporters**: Statistics on who reports bugs and quality of reports
6. **Trends and Patterns**: Identification of bug occurrence patterns
7. **Recommendations**: Suggested improvements for bug handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting (`npm run lint`)
5. Submit a pull request

## Author

Rahul Joshua Damanik

## License

MIT License 