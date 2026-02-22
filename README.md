# Tab Saver - Chrome Extension

A Chrome extension similar to One Tab that saves all open tabs and allows you to restore them later.

## Features
- Save all open tabs with one click
- Restore individual tabs or all at once
- Delete saved tabs you no longer need
- Search through saved tabs
- Clean, modern UI

## Installation (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `project-tab/` folder
5. The extension icon will appear in your toolbar

## Usage

Click the extension icon to open the popup:
- **Save All Tabs**: Saves all open tabs and closes them
- **Restore All**: Opens all saved tabs in new tabs
- Click on any saved tab to restore just that one
- Click the trash icon to delete a saved tab

## How the `.ai/` Structure is Used

This project demonstrates the `.ai/` best practices:

### 1. Project Context (`.ai/context/project.md`)
- Defines the tech stack (Chrome Extension API, Manifest V3)
- Specifies project structure
- Lists coding standards to follow
- Documents environment setup

### 2. Rules (`.ai/rules/`)
- **core.md**: TDD approach, file length limits (300 lines), documentation requirements
- **typescript.md**: Applied to JavaScript (type hints via JSDoc, ESLint patterns)
- All code follows these rules automatically

### 3. Workflows (`.ai/workflows/`)
- **development.md**: Steps for feature development and bug fixes
- **refactoring.md**: When files exceed 300 lines, function extraction patterns
- **debugging.md**: Systematic debugging approach

### 4. Task Tracking (`TASK.md`)
- Current sprint: MVP - Basic One Tab Clone
- Tracks in-progress, backlog, and completed items
- Documents discovered issues during development

## Code Quality

- All functions have JSDoc documentation
- Maximum file length: 300 lines
- Maximum function length: 50 lines
- Proper error handling with try/catch
- ES6+ modern JavaScript

## File Structure

```
project-tab/
├── manifest.json       # Extension configuration (Manifest V3)
├── popup.html         # Extension popup UI
├── popup.css          # Popup styles (under 300 lines)
├── popup.js           # Popup logic (under 300 lines)
├── background.js      # Service worker for background tasks
├── icons/             # Extension icons
└── .ai/              # AI configuration and rules
    ├── context/project.md
    ├── rules/
    └── workflows/
```

## Storage

Uses Chrome Storage API (`chrome.storage.local`) to persist saved tabs across browser sessions.

## License

MIT
