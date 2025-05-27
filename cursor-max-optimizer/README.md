# AI Context Optimizer

A toolkit to generate comprehensive project context for AI assistants, potentially save on tool call costs (depending on the AI service), and enhance your AI coding productivity.

*Version: 0.2.3*

## Overview

This tool helps you get the most out of AI models by generating a single context file containing your project's structure and relevant code. This approach aims to:

-   **Improve AI Understanding**: Provides the AI with a broad view of your project upfront.
-   **Reduce Repetitive Actions**: Minimizes the need for the AI to repeatedly read individual files (if it supports long context efficiently).
-   **Control Context**: Lets you precisely include/exclude files and directories based on names, paths, and extensions. Excluded files/directories are ignored recursively.
-   **Provide Usage Insights**: Offers statistics on the total token count of the generated context and a breakdown of file types.
-   **Potential Efficiency Gain**: May reduce costs or processing time associated with per-file-read tool calls on platforms that charge for them or process them slowly.

## Context Optimizer (`createContext.js`)

The core tool generates a comprehensive context file (`context.md` by default) containing your codebase structure and selected file content.

### Features

-   **Codebase Snapshot**: Creates an organized view of your project structure and included code.
-   **Token Estimation**: Provides an estimate for the total token size of the generated context.
-   **Visual Directory Tree**: Includes a text-based representation of your *included* project structure.
-   **Flexible Configuration**: Control included/excluded paths, file extensions, and max file size.
-   **Support for Extensionless Files**: Can include files like `Makefile` or project-specific scripts by specifying `''` in `includeExtensions`.
-   **Recursive Exclusions**: Correctly handles exclusions for directories or files nested deep within the project using the `find` command.
-   **Extension Filtering**: Files not matching `includeExtensions` are completely ignored (not listed in the tree or content sections).

### How It Works

1.  The script uses the **`find` command** (requires a Unix-like environment: Linux, macOS, WSL, Git Bash, Cygwin) to locate files based on your `excludePaths` and `includePaths` rules.
2.  It then filters this list based on the file extensions specified in `includeExtensions` (including handling for extensionless files).
3.  It generates a Markdown file containing:
    *   A project header and generation timestamp.
    *   A visual directory tree showing *only* the files that passed both path and extension filters.
    *   The content of these included files (if within the size limit), formatted in code blocks with language identifiers.
4.  You copy this Markdown content and paste it into your AI chat session.
5.  Instruct the AI to use this pre-loaded context.

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
        'build/',           // Excludes 'build' folder and its contents anywhere (note trailing slash for clarity)
        '*.log',            // Excludes files ending in .log anywhere
        '*.lock',           // Excludes files ending in .lock anywhere
        // Add your project-specific exclusions here
      ],

      // File extensions to include. Files NOT matching are completely ignored.
      // Applied *after* path filtering. Empty array includes all extensions.
      includeExtensions: [
        '.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css', '.scss',
        '.json', '.md', '.yml', '.yaml', '.sh',
        '', // For extensionless files like 'Makefile', 'run_script'
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

    ```bash
    IMPORTANT INSTRUCTIONS FOR PROCESSING THE PROVIDED CONTEXT:

    You have been provided with a snapshot of the project structure and file contents in the message above (formatted like a `context.md` file). Please adhere to the following:

    1.  **PRIORITIZE PROVIDED CONTEXT:** Assume the provided text contains the necessary project information. Do NOT use file-reading tools unless absolutely necessary or explicitly asked to fetch something confirmed *not* present in the initial context.
    2.  **USE SEARCH/GREP TOOLS (Conceptually):** If you need to find specific code snippets or patterns within the provided context, use your internal search capabilities *on the provided text* rather than attempting to read individual files from an external system.
    3.  **EFFICIENCY:** Focus on answering the request directly using the given context. Avoid unnecessary introductory phrases.
    4.  **EDITING (If Applicable):** When asked to make changes, generate the complete, updated code blocks based on the provided context and the requested modifications. Be precise.
    5.  **CLARIFICATION:** If the request is ambiguous or seems to require information clearly outside the provided context, ask for clarification.

    Remember: Relying on the provided context is generally more efficient.

    ---
    [Your actual question or request here]
    ---
    ```

### Context File Output Example (`context.md`)

The generated file only includes files matching `includeExtensions`.

```bash
# Project Context: my-generic-app

Generated: 2025-04-23T12:00:00.000Z

## Directory Structure

├── 📁 src/
│   ├── 📁 components/
│   │   ├── 📄 Button.jsx
│   │   └── 📄 Modal.tsx
│   ├── 📁 utils/
│   │   └── 📄 helpers.js
│   ├── 📄 App.jsx
│   └── 📄 index.js
├── 📁 public/
│   └── 📄 index.html
├── 📄 package.json
├── 📄 vite.config.ts
└── 📄 README.md

## File Contents

### `./src/components/Button.jsx`

import React from 'react';

function Button({ label, onClick }) {
  return <button onClick={onClick}>{label}</button>;
}

export default Button;

### `./src/App.jsx`

import React from 'react';
import Button from './components/Button';
import './App.css'; // Assuming App.css is also included via includeExtensions

function App() {
  const handleClick = () => {
    console.log('Button clicked!');
  };

  return (
    <div>
      <h1>My Generic App</h1>
      <Button label="Click Me" onClick={handleClick} />
    </div>
  );
}

export default App;

(... other included files like `index.html`, `package.json`, `helpers.js` etc. ...)
```

### Terminal Output Example (Updated for v0.2.3)

```bash
🔍 Finding relevant files...
   Found 150 files initially. Filtering by extension...
   85 files match extension criteria. Processing...
🌳 Generating directory structure...
📄 Processing file contents...
💾 Writing output to context.md...

============================================================
📊 CONTEXT FILE STATISTICS
============================================================
📝 Content Summary:
  • Context file created: context.md
  • File size: 750.20 KB
  • Estimated total tokens: ~180,500
  • Characters (content only): 720,100
  • Markdown overhead (est.): ~1,850 tokens

📁 File Processing:
  • Files found by path search: 150
  • Files matching extensions: 85
  • File content included: 82
  • File content skipped (size limit): 3
  • Total original size of processed files: 0.95 MB

📊 File Types Distribution (Processed Files with Content Included):
  • .jsx: ~75,000 tokens (30 files processed)
  • .js: ~45,000 tokens (25 files processed)
  • .ts: ~25,000 tokens (10 files processed)
  • .tsx: ~15,000 tokens (5 files processed)
  • .json: ~10,000 tokens (6 files processed)
  • .css: ~8,000 tokens (5 files processed)
  • .md: ~2,500 tokens (1 file processed)
  • ... and more
============================================================
✨ Done! Copy the contents of context.md into your AI chat.
Be mindful of the total token count when providing this to an AI assistant.
For very large projects, consider further refining includes/excludes or splitting context.
============================================================
```

### Custom Mode Setup (Example for an AI Chat Interface)

If your AI chat interface allows custom instructions or system prompts:

1.  **Locate Settings**: Find where you can set custom instructions for new chats or specific modes.
2.  **Paste Instructions**: Use the template provided in step 5 of the "Usage" section as a starting point.
3.  **Tool Preferences**: If the interface allows you to prefer or disable certain "tools" (like file reading), consider discouraging direct file access to encourage the AI to use the context you've provided.

## Best Practices

-   **Generate Fresh Context**: Run the script whenever significant changes occur in your codebase.
-   **Understand Token Limits**: Be aware of the context window limitations of the AI model you are using. The script provides a total token estimate.
-   **Be Specific**: Clearly state your request after pasting the context.
-   **Verify AI Output**: Always review code generated or modified by the AI.
-   **Refine Configuration**: Tune `excludePaths` and `includeExtensions` to get the desired context while managing token counts. Use `debug: true` to troubleshoot the `find` command if needed.
-   **Large Projects**: For extremely large projects, you might need to be more selective with `includePaths` or generate context for specific sub-modules to stay within token limits.

## Requirements

-   Node.js (v20 or later recommended).
-   **Unix-like environment** providing the `find` command (e.g., Linux, macOS, Windows Subsystem for Linux (WSL), Git Bash, Cygwin). The script relies on `find` for efficient path filtering.
