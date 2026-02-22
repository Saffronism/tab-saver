# AI Features Requirements

## Feature 1: Smart Tab Categorization

### Description
Automatically analyze and categorize saved tabs into predefined categories based on URL patterns, page titles, and optionally page content.

### Categories
- **Work** - GitHub, Jira, Confluence, Slack, Docs
- **News** - News sites, RSS feeds, blogs
- **Shopping** - E-commerce, product pages, Amazon
- **Tech** - Documentation, Stack Overflow, tutorials
- **Entertainment** - YouTube, Netflix, social media
- **Social** - Twitter, Facebook, LinkedIn
- **Research** - Wikipedia, academic papers, PDFs
- **Other** - Uncategorized tabs

### Requirements
1. Auto-categorize on save with 80%+ accuracy
2. Show category badge in popup UI
3. Allow manual category override
4. Category filter dropdown in search area
5. Restore all tabs by category

### Data Flow
```
Save Tab → Analyze URL/Title → Assign Category → Store with tab data
```

### API Integration
- Primary: OpenAI GPT-4-mini or Claude Haiku
- Fallback: URL pattern matching (regex-based)
- Cost target: <$0.01 per 10 tabs

---

## Feature 2: Page Content Summarization

### Description
Generate concise summaries of web page content to help users remember why they saved a tab.

### Requirements
1. Summary max 200 characters
2. Fetch content via content script
3. Generate summary via LLM API
4. Show summary on hover in popup
5. Cache summaries for 7 days

### Data Structure
```javascript
{
  id: string,
  title: string,
  url: string,
  category: string,
  summary: string,        // AI-generated
  summaryAt: timestamp,
  savedAt: timestamp
}
```

### API Integration
- Model: OpenAI GPT-4-mini or Claude 3 Haiku
- Prompt: "Summarize this web page in 1-2 sentences. Focus on the main topic and key takeaways."
- Cost target: <$0.02 per page

---

## Feature 3: Smart Tab Grouping

### Description
Group related tabs together (e.g., all GitHub PRs, all documentation pages).

### Requirements
1. Detect similar domains/paths
2. Suggest grouping before save
3. Show groups as collapsible sections
4. Restore entire group

---

## Feature 4: Tab Deduplication

### Description
Detect and prevent saving duplicate URLs.

### Requirements
1. Check for existing URL before saving
2. Show warning if duplicate detected
3. Option to update existing or skip
4. Normalize URLs (remove tracking params)

---

## UI Requirements

### Popup Changes
- Category badge on each tab item
- Category filter dropdown
- "Restore Category" buttons
- Summary tooltip on hover
- Settings gear icon for AI config

### Settings Panel
- API provider selection (OpenAI/Anthropic/Local)
- API key input (stored securely)
- Enable/disable summarization
- Enable/disable categorization
- Clear cached data button

---

## Technical Requirements

### Permissions Needed
```json
{
  "permissions": ["tabs", "storage", "activeTab", "scripting"],
  "host_permissions": ["<all_urls>"]
}
```

### Content Script
- Inject into all pages
- Extract page text content
- Send to background for processing

### Background Script
- Handle API calls to LLM
- Cache summaries
- Rate limiting

### Storage
- Use `chrome.storage.local`
- Max 5MB (Chrome limit)
- Implement LRU cache for summaries

---

## Error Handling

### API Errors
- Rate limit: Queue and retry with backoff
- Timeout: Skip summarization, keep tab
- Invalid key: Show settings prompt

### Content Errors
- Page not accessible: Use URL-only categorization
- Paywall detected: Use title-only summarization

---

## Privacy Requirements

1. API key stored in Chrome storage (encrypted at rest)
2. Page content sent to LLM only if enabled
3. Option to use local LLM (Ollama/LM Studio)
4. No analytics or tracking
5. All data stays in user's browser
