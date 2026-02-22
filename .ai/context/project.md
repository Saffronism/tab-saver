# Project Overview
## Basic Info
- **Project Name**: Tab Saver - One Tab Clone
- **Type**: Chrome Browser Extension
- **Language**: JavaScript, HTML, CSS
- **Main Entry**: `manifest.json`

## Tech Stack
- **Language**: JavaScript (ES6+)
- **Framework**: Chrome Extension APIs (Manifest V3)
- **UI**: Vanilla HTML/CSS with Chrome extension popup
- **Storage**: Chrome Storage API (sync/local)
- **Permissions**: `tabs`, `storage`, `activeTab`

## Project Structure
```
project-tab/
├── .ai/                    # AI configuration
│   ├── context/
│   │   └── project.md
│   ├── rules/
│   │   ├── core.md
│   │   └── typescript.md   # Using JS but following TS best practices
│   ├── workflows/
│   │   └── development.md
│   └── templates/
│       └── PLANNING.md
├── manifest.json           # Extension config
├── popup.html             # Extension popup UI
├── popup.css              # Popup styles
├── popup.js               # Popup logic
├── background.js          # Service worker
├── content.js             # Content script (if needed)
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── tests/                 # Test files
│   └── popup.test.js
└── TASK.md                # Sprint tracking
```

## Coding Standards
- **Style Guide**: Follow `.ai/rules/typescript.md` patterns for JS
- **Linting**: ESLint with Chrome extension rules
- **Testing**: Manual testing via Chrome DevTools + automated where possible
- **Documentation**: JSDoc comments for all functions

## Key Dependencies
- Chrome Extension APIs
- AI/LLM API for categorization and summarization (OpenAI, Anthropic, or local)
- Manifest V3 format

## Environment
- **Development**: Load unpacked in Chrome Dev mode
- **Testing**: Chrome browser with extension developer mode
- **Production**: Chrome Web Store (future)

## Extension Features
1. Save all open tabs to a list
2. **AI Categorization**: Auto-group tabs by topic (Work, News, Shopping, Tech, etc.)
3. **AI Summarization**: Generate brief summaries of page content before closing
4. Restore individual tabs or all at once
5. Restore by category (restore all "Work" tabs, etc.)
6. Delete saved tab entries
7. Search/filter saved tabs
8. Persist data across browser sessions
