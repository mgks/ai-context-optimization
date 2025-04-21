# Cursor MAX Optimizer

A toolkit to optimize Cursor AI interactions, save on MAX tool call costs, and enhance your AI coding productivity.

## Overview

Cursor MAX Optimizer helps you get the most out of Cursor's AI capabilities by reducing token costs and providing better project context to AI models. This toolkit:

- Saves money by drastically reducing tool call costs when using MAX models 
- Improves AI understanding by providing complete project context upfront
- Optimizes workflow by eliminating the need for multiple slow file-reading operations
- Gives you control over which files to include/exclude from context

## Context Optimizer (`createContext.js`)

The core tool in this collection is the Context Optimizer, which generates a comprehensive context file containing your entire codebase structure and content. This file can be pasted directly into Cursor (or other AI assistants) to provide complete project context at once.

### Features

- **Complete Codebase Snapshot**: Creates a carefully organized view of your entire project
- **Cost Savings**: Up to 95% reduction in tool call costs versus individual file reads 
- **Token Optimization**: Intelligent structure minimizes token usage
- **Visual Directory Tree**: Creates a visual representation of your codebase structure
- **Privacy Control**: Respect .gitignore patterns and custom exclusions
- **Performance Statistics**: Shows token usage and compatibility with different AI models

### How It Works

1. The script scans your project directory and creates a Markdown file with:
   - A visual directory tree of your entire project
   - The complete content of all included files, properly formatted with language markers
   - Clear section headers and organization for AI understanding

2. You paste this single file into your Cursor session, giving the AI a complete view of your project

3. This eliminates the need for repeated expensive tool calls to read individual files

### Cost Comparison Example

For a typical project with 100 files:
- Without Optimizer: $5.00 (100 file reads @ $0.05 each)
- With Optimizer: $0.05 (single prompt)
- **Savings: $4.95 (99%)**

### Usage

1. Configure the script by modifying the `config` object:
```javascript
const config = {
  // Output file name
  outputFile: 'context.md',
  
  // Directories and files to exclude 
  excludePaths: [
    'node_modules',
    '.git',
    'dist',
    // Add your exclusions here
  ],
  
  // File extensions to include
  includeExtensions: [
    '.js', '.jsx', '.ts', '.tsx', '.html', '.css'
    // Add your extensions here
  ]
};
```

2. Run the script:
```
node cursor-max-optimizer/createContext.js
```

3. Copy the generated `context.md` file contents into your Cursor chat

4. Use the following template for your AI prompt or header custom instructions if using IDE or agent:

```
You're working with a pre-loaded context.md file containing my entire project structure. 
IMPORTANT INSTRUCTIONS:
1. The file structure is already provided - DO NOT waste tool calls reading files unnecessarily
2. Use grep to find relevant code rather than reading files directly
3. When editing, be precise and make all necessary changes in a SINGLE edit operation when possible
4. Keep explanations brief - focus on implementation
5. Never suggest reading files that are already in the context
6. Assume you have complete project context from the context.md file
7. Focus on efficiently using grep patterns to locate relevant code sections
8. Wait for explicit permission before making any edits to files
9. Skip normal "I'll help you with that" introductions - be direct and efficient

Remember that each tool call costs money, so prioritize grep for finding patterns across files rather than reading individual files.

[Your actual request here]
```

### Context File Output Example

The generated `context.md` file will look like:

#### Directory Structure

```
├── 📁 docs/
│   ├── api.md
│   └── setup.md
├── 📁 src/
│   ├── 📁 components/
│   │   ├── Button.js
│   │   └── Card.js
│   ├── App.js
│   └── index.js
└── package.json
```

#### File Contents

```
### src/App.js

----- src/App.js file starts -----

import React from 'react';
function App() {
  return (
    <div className="App">
      <h1>Hello World</h1>
    </div>
  );
}
export default App;

----- src/App.js file ends -----

...
```

### Terminal Output Example

When you run the script, you'll see detailed statistics about your context file:

```
============================================================
📊 CONTEXT FILE STATISTICS
============================================================
📝 Content Summary:
  • Context file created: context.md
  • File size: 1.25 MB
  • Estimated tokens: 284,932
  • Characters: 1,424,660
  • Markdown overhead: ~2,845 tokens

📁 File Processing:
  • Total files found: 87
  • Files included: 74
  • Files skipped: 13
    - Skipped (size): 3
    - Skipped (type): 10
  • Total original size: 2.34 MB

📊 File Types Distribution:
  • .js: 32 files, ~105,425 tokens
  • .jsx: 18 files, ~84,331 tokens
  • .css: 9 files, ~37,982 tokens
  • .json: 6 files, ~24,518 tokens
  • .md: 4 files, ~14,267 tokens
  • .html: 3 files, ~12,654 tokens
  • .txt: 2 files, ~5,755 tokens

📈 Token Usage by AI Model:
  ✅ Claude 3.5 Sonnet: 67.4% of 120,000 token limit
  ✅ Claude 3.7 Sonnet: 67.4% of 120,000 token limit
  ✅ Claude 3.7 MAX: 40.4% of 200,000 token limit
  ✅ Gemini 2.5 Pro: 67.4% of 120,000 token limit
  ✅ Gemini 2.5 Pro MAX: 8.1% of 1,000,000 token limit
  ✅ GPT-4o: 63.2% of 128,000 token limit

💰 Cost Comparison:
  • Claude 3.7 Sonnet: $1.2451
  • Claude 3.7 MAX: $3.7500
  • Gemini 2.5 Pro: $1.1396
  • Gemini 2.5 Pro MAX: $3.7500
  • GPT-4o: $1.2214

💸 Tool Call Savings:
  • Without this script: $3.70 (74 file reads @ $0.05)
  • With this script: $0.05 (single prompt)
  • Savings: $3.65 (99%)
=================================================================
✨ Done! Copy the contents of context.md into your Cursor chat.
=================================================================
```

### Custom Mode Setup

1. In Cursor Settings > Custom Modes > Add New
2. Name: "Max Context Mode"
3. Model: Choose a MAX model (Claude 3.7 MAX or Gemini 2.5 Pro MAX)
4. Enable only Grep and Edit tools, disable all others
5. Optional: Enable auto-run in advanced options
6. Paste the custom instructions from above
7. Optional: Add a keyboard shortcut

## Best Practices

### Efficient Workflow
1. Generate your context file
2. Start a new chat with your custom MAX mode
3. Paste the context file at the beginning
4. Use grep to locate relevant code
5. Request specific edits when ready
6. Make batched changes rather than multiple small edits

### Configuration

You can customize the script by editing the config object at the top:

```javascript
const config = {
  outputFile: 'context.md',
  includePaths: [], // empty = include all
  excludePaths: [
    'node_modules',
    '.git',
    'dist',
    // add your exclusions
  ],
  includeExtensions: [
    '.js', '.jsx', '.ts', '.tsx', '.php', '.html', '.css',
    // add your extensions
  ],
  maxFileSizeKB: 500
};
```

## Requirements

- Node.js 14+
- Unix-like environment for directory tree generation (Linux, macOS, WSL on Windows)