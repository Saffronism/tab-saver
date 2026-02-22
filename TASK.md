# Task Tracking - Tab Saver Extension

## Current Sprint
Sprint: AI-Powered Tab Management  
Dates: Feb 22 - Feb 28

## In Progress
- [ ] Implement AI categorization for tabs
- [ ] Implement AI summarization of page content
- [ ] Add category-based restore functionality

## Backlog
- [ ] Fetch page content for AI analysis
- [ ] Integrate with LLM API (OpenAI/Anthropic/local)
- [ ] Design category UI in popup
- [ ] Add settings for AI provider/API key
- [ ] Handle rate limiting and errors
- [ ] Cache summaries to reduce API calls
- [ ] Add category filter/search
- [ ] Export tabs by category

## Completed
- [x] Initialize .ai/ project structure - Feb 22
- [x] Remove TDD requirement - Feb 22
- [x] Create basic extension (manifest, popup, background) - Feb 22

## AI Features Specification

### Categorization
- Analyze tab URLs and page titles
- Group into categories: Work, News, Shopping, Tech, Entertainment, Social, Research, Other
- Allow manual category override
- Show category badges in popup

### Summarization
- Fetch page content via content script
- Send to LLM API for summarization
- Show summary tooltip on hover
- Store summary with tab data
- Max 200 character summaries

### UI Changes Needed
- Category badges on tab items
- Category filter dropdown
- "Restore Category" button
- Settings panel for AI configuration
- Summary preview on hover

## Discovered During Development
- [ ] Need content script permissions for page scraping
- [ ] Need to handle CORS for external API calls
- [ ] Consider local LLM option for privacy
- [ ] Storage quota may be exceeded with summaries
