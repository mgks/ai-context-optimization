# AI Context Optimizer

A toolkit to generate comprehensive project context for AI assistants, potentially save on tool call costs, and enhance your AI coding productivity.

*Version: 0.2.1*

## Overview

This tool helps you get the most out of large context window AI models by generating a single context file containing your project's structure and relevant code. This approach aims to:

-   **Improve AI Understanding**: Provides the AI with a broad view of your project upfront.
-   **Reduce Repetitive Actions**: Minimizes the need for the AI to repeatedly read individual files (if it supports long context efficiently).
-   **Control Context**: Lets you precisely include/exclude files and directories based on names, paths, and extensions. Excluded files/directories are ignored recursively.
-   **Provide Usage Insights**: Offers statistics on token count and estimated context window usage for various models.
-   **Potential Cost Savings**: May reduce costs associated with per-file-read tool calls on platforms that charge for them (e.g., some modes in Cursor).

## Context Optimizer (`createContext.js`)

The core tool generates a comprehensive context file (`context.md` by default) containing your codebase structure and selected file content.

### Features

-   **Codebase Snapshot**: Creates an organized view of your project structure and included code.
-   **Token Estimation**: Provides estimates for the generated context size.
-   **Model Compatibility Check**: Shows estimated usage against popular large context models.
-   **Visual Directory Tree**: Includes a text-based representation of your *included* project structure.
-   **Flexible Configuration**: Control included/excluded paths, file extensions, and max file size.
-   **Recursive Exclusions**: Correctly handles exclusions for directories or files nested deep within the project using the `find` command.
-   **Extension Filtering**: Files not matching `includeExtensions` are completely ignored (not listed in the tree or content sections).

### How It Works

1.  The script uses the **`find` command** (requires a Unix-like environment: Linux, macOS, WSL, Git Bash, Cygwin) to locate files based on your `excludePaths` and `includePaths` rules.
2.  It then filters this list based on the file extensions specified in `includeExtensions`.
3.  It generates a Markdown file containing:
    *   A project header and generation timestamp.
    *   A visual directory tree showing *only* the files that passed both path and extension filters.
    *   The content of these included files (if within the size limit), formatted in code blocks with language identifiers.
4.  You copy this Markdown content and paste it into your AI chat session.
5.  Instruct the AI to use this pre-loaded context.

### Potential Cost Savings Example (Illustrative)

*Scenario*: Using an AI service that charges $0.05 per "file read" tool call (verify your provider's actual pricing). Project has 100 files included by the script.

-   **Without Optimizer (using tool calls)**: 100 file reads \* $0.05/read = $5.00
-   **With Optimizer (single prompt)**: 1 prompt fee (e.g., $0.05, depends on provider) = $0.05
-   **Potential Savings**: $4.95

**Note:** Savings depend heavily on the AI provider's pricing model for tool usage vs. large context input tokens. Per-token costs for large inputs can also be significant.

### Usage

1.  **Prerequisites**:
    *   Node.js (v14 or later recommended).
    *   A Unix-like environment providing the `find` command (Linux, macOS, WSL, Git Bash, Cygwin on Windows).
2.  **Configure**: Open `createContext.js` and modify the `config` object:

    ```javascript
    const config = {
      // Output file name
      outputFile: 'context.md',

      // Paths/patterns to include (optional, empty = all not excluded by path)
      // Applied during the initial 'find' step. Simple path matching.
      // e.g., ['./src'] // Include only files within the 'src' directory
      includePaths: [],

      // Directories, files, or simple patterns (*.ext) to exclude recursively.
      // Applied during the initial 'find' step.
      excludePaths: [
        'createContext.js', // This script
        'context.md',       // Output file
        '.DS_Store',
        'node_modules',     // Excludes 'node_modules' folder anywhere
        '.git',             // Excludes '.git' folder anywhere
        'dist',             // Excludes 'dist' folder anywhere
        'build',            // Excludes 'build' folder anywhere
        '*.log',            // Excludes files ending in .log anywhere
        '*.lock',           // Excludes files ending in .lock anywhere
        // Add your project-specific exclusions here
      ],

      // File extensions to include. Files NOT matching are completely ignored.
      // Applied *after* path filtering. Empty array includes all extensions.
      includeExtensions: [
        '.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css', '.scss',
        '.json', '.md', '.yml', '.yaml',
        // Add extensions relevant to your project
      ],

      // Max file size in KB to include content for
      maxFileSizeKB: 500,

      // Set to true to see the generated 'find' command
      debug: false
    };
    ```

3.  **Run**: Navigate to your project's root directory in the terminal and run:
    ```bash
    node /path/to/createContext.js
    ```
    (Replace `/path/to/` with the actual path if the script isn't in your project root).

4.  **Copy**: Copy the entire content of the generated `context.md` file.

5.  **Paste & Instruct**: Paste the copied content into your AI chat interface. Use custom instructions similar to the template below:

    ```
    IMPORTANT INSTRUCTIONS FOR PROCESSING THE PROVIDED CONTEXT:

    You have been provided with a snapshot of the project structure and file contents in the message above (`context.md` format). Please adhere to the following:

    1.  **PRIORITIZE PROVIDED CONTEXT:** Assume the provided text contains the necessary project information. Do NOT use file-reading tools unless absolutely necessary or explicitly asked to fetch something confirmed *not* present in the initial context.
    2.  **USE SEARCH/GREP TOOLS:** If you need to find specific code snippets or patterns within the provided context, use search/grep-like tools (if available) *on the provided text* rather than attempting to read individual files from the system.
    3.  **EFFICIENCY:** Focus on answering the request directly using the given context. Avoid unnecessary introductory phrases.
    4.  **EDITING (If Applicable):** When asked to make changes, generate the complete, updated code blocks based on the provided context and the requested modifications. Be precise.
    5.  **CLARIFICATION:** If the request is ambiguous or seems to require information clearly outside the provided context, ask for clarification.

    Remember: Relying on the provided context is more efficient than making external tool calls.

    ---
    [Your actual question or request here]
    ---
    ```

### Context File Output Example (`context.md`)

The generated file only includes files matching `includeExtensions`.

```jsx
# Project Context: my-web-app

Generated: 2025-04-22T20:00:00.000Z

## Directory Structure

├── 📁 src/
│   ├── 📁 components/
│   │   ├── 📄 Button.jsx
│   │   └── 📄 Card.jsx
│   ├── 📄 App.jsx
│   └── 📄 index.js
├── 📄 package.json
└── 📄 README.md

## File Contents

### `./src/components/Button.jsx`

import React from 'react';

function Button({ label }) {
  return <button>{label}</button>;
}

export default Button;

### `./src/App.jsx`

import React from 'react';
import Button from './components/Button';

function App() {
  return (
    <div>
      <h1>My App</h1>
      <Button label="Submit" />
    </div>
  );
}

export default App;

(... other included files ...)
```

### Terminal Output Example

Note that "Skipped (type)" is no longer shown, and counts reflect the final included files.

```
============================================================
📊 CONTEXT FILE STATISTICS
============================================================
📝 Content Summary:
  • Context file created: context.md
  • File size: 950.75 KB
  • Estimated tokens: ~210,500
  • Characters (included content): 842,000
  • Markdown overhead: ~2,100 tokens

📁 File Processing:
  • Files found by path search: 150
  • Files included (matching extensions): 85
  • File content included in output: 82
  • File content skipped (size limit): 3
  • Total size of included files: 1.15 MB

📊 File Types Distribution (Included Files):
  • .jsx: ~95,000 tokens (40 files)
  • .js: ~55,000 tokens (25 files)
  • .json: ~28,000 tokens (8 files)
  • .scss: ~15,000 tokens (7 files)
  • .md: ~12,500 tokens (5 files)

📈 Token Usage by AI Model:
  ⚠️ Claude 3 Haiku: 100.0% used (~210,500 / 200,000 tokens) ❌
  ⚠️ Claude 3.5 Sonnet: 100.0% used (~210,500 / 200,000 tokens) ❌
  ⚠️ GPT-4o: 100.0% used (~210,500 / 128,000 tokens) ❌
  ⚠️ GPT-4 Turbo: 100.0% used (~210,500 / 128,000 tokens) ❌
  ✅ Gemini 1.5 Pro: 21.1% used (~210,500 / 1,000,000 tokens) ✅
  ✅ Gemini 1.5 Flash: 21.1% used (~210,500 / 1,000,000 tokens) ✅

💰 Cost Comparison (Illustrative):
  • Claude 3.5 Sonnet ($3/M): ~$0.6315
  • GPT-4o ($5/M): ~$1.0525
  • Gemini 1.5 Pro ($3.5/M): ~$0.7367
  • Cursor MAX (This Script): ~$0.0500
  • Cursor MAX (File Reads): ~$4.1000

💸 Potential Tool Call Savings (Example @ $0.05/call):
  • Est. Cost w/ File Reads: ~$4.10 (82 included files)
  • Est. Cost w/ This Script: ~$0.05 (1 prompt)
  • Potential Savings: ~$4.05 (99%)
============================================================
✨ Done! Copy the contents of context.md into your AI chat.
============================================================
```

### Custom Mode Setup (Example for Cursor)

1.  In Cursor: `File` > `Configure Workspace` > `Edit Custom Prompts...` (or Settings > Custom Modes).
2.  Create a new Custom Mode or edit an existing one.
3.  **Name**: e.g., "Max Context Prompt"
4.  **Model**: Choose a model with a large context window (e.g., Claude 3.5 Sonnet, GPT-4o, Gemini 1.5 Pro).
5.  **Tools**: Consider enabling only `grep` and `edit` tools, disabling file reading tools if possible, to encourage use of the provided context.
6.  **Instructions/Prompt Header**: Paste the custom instructions template provided in step 5 of the Usage section above.

## Best Practices

-   **Generate Fresh Context**: Run the script whenever significant changes occur in your codebase.
-   **Target Large Context Models**: This approach works best with models designed for large context inputs.
-   **Be Specific**: Clearly state your request after pasting the context.
-   **Verify AI Output**: Always review code generated or modified by the AI.
-   **Refine Configuration**: Tune `excludePaths` and `includeExtensions` to get the desired context while managing token counts. Use `debug: true` to troubleshoot the `find` command if needed.

## Requirements

-   Node.js (v14 or later recommended).
-   **Unix-like environment** providing the `find` command (e.g., Linux, macOS, Windows Subsystem for Linux (WSL), Git Bash, Cygwin). The script relies on `find` for efficient path filtering.
