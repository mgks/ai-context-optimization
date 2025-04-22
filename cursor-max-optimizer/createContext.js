#!/usr/bin/env node

/**
 * AI Context Optimization : Comprehensive Context Creation Tool
 * ------------------------------
 * A tool for generating comprehensive code context for AI assistants while minimizing token costs.
 *
 * This script creates a single markdown file containing your entire codebase structure and content,
 * which can be pasted directly into AI chat interfaces (like Cursor's MAX models) to provide
 * complete project context in one go, eliminating the need for multiple expensive tool calls.
 *
 * BENEFITS:
 * - Save money: Reduces cost significantly when using MAX models (avoiding per file read)
 * - Better context: Provides the AI with a complete view of your project at once
 * - Privacy control: Only includes files you want, respecting custom exclusions
 * - Performance stats: Shows token counts, model compatibility, and cost estimations
 *
 * USAGE:
 * 1. Configure the excludePaths, includePaths, and includeExtensions in the config object below
 * 2. Run: node createContext.js
 * 3. Copy the generated context.md into your AI chat
 * 4. Use a custom mode with just grep and edit tools enabled (see README)
 *
 * Created by: Ghazi Khan (mgks.dev)
 * Version: 0.2.1
 *
 * CHANGELOG:
 * - v0.2.0: (2025-04-22)
 *   - Updated model context window sizes based on latest available information.
 *   - Re-included Claude 3.7 Sonnet/MAX names as requested.
 *   - Fixed recursive exclusion using improved `find` command logic.
 *   - Removed redundant helper functions (`shouldExclude`, `shouldInclude`).
 *   - Updated model context limits and warning threshold (70%).
 *   - Enhanced configuration defaults (more exclusions/extensions).
 *   - Improved statistics reporting and cost comparison.
 *   - Added debug flag, better error handling, and code quality improvements.
 *   - Refined language detection and token estimation.
 *   - Added project name and timestamp to output.
 * - v0.1.0: Initial release.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// --- CONFIGURATION ---
// Define the output file name outside the config object so we can reference it
const outputFileName = 'context.md';

const config = {
  // Output file name
  outputFile: outputFileName,

  // Directories and files/patterns to include (empty array means include everything not excluded)
  // Uses `find -path` patterns (e.g., './src/*' or './lib/*.js')
  includePaths: [], // Example: ['./src', './lib/*.js']

  // Directories, files, or patterns to exclude.
  // Will exclude recursively if it's a directory name.
  // NOTE: Uses `find` patterns. Simple names (like 'node_modules') exclude that name anywhere.
  // Paths with slashes (like 'dist/specific') are matched from the root.
  excludePaths: [
    'createContext.js', // This script itself
    outputFileName,     // The output file
    '.DS_Store',
    'node_modules',
    '.git',             // Exclude .git directory anywhere
    '.hg',              // Exclude Mercurial directory anywhere
    '.svn',             // Exclude Subversion directory anywhere
    '.idea',            // Exclude JetBrains IDE metadata anywhere
    '.vscode',          // Exclude VSCode metadata anywhere (unless you want settings included)
    '.cursorignore',
    '.cursorindexingignore',
    'dist',
    'build',
    'out',
    'vendor',
    '*.log',            // Exclude log files
    '*.lock',           // Exclude lock files (like package-lock.json, yarn.lock) - adjust if needed
    '*.swp',            // Exclude vim swap files
    '*.bak',            // Exclude backup files
    '*.tmp',            // Exclude temporary files
    'pycache',          // Exclude python cache
    '__pycache__',      // Exclude python cache (alternative name)
    // Add project-specific exclusions here
    // 'amplify-*',
    // '*-sdk',
  ],

  // File extensions to include in content (empty array means include all files found)
  // Files not matching these extensions will be listed in the structure but content omitted.
  includeExtensions: [
    // Programming Languages
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', // JavaScript/TypeScript
    '.py',                                      // Python
    '.java',                                    // Java
    '.cs',                                      // C#
    '.php',                                     // PHP
    '.rb',                                      // Ruby
    '.go',                                      // Go
    '.rs',                                      // Rust
    '.swift',                                   // Swift
    '.kt', '.kts',                              // Kotlin
    '.dart',                                    // Dart
    '.scala',                                   // Scala
    '.lua',                                     // Lua
    '.pl',                                      // Perl
    '.c', '.h', '.cpp', '.hpp',                 // C/C++

    // Web Development
    '.html', '.htm',                            // HTML
    '.css', '.scss', '.sass', '.less',          // CSS/Preprocessors
    '.vue',                                     // Vue.js
    '.svelte',                                  // Svelte

    // Data Formats & Config
    '.json',                                    // JSON
    '.xml',                                     // XML
    '.yml', '.yaml',                            // YAML
    '.toml',                                    // TOML
    '.ini',                                     // INI
    '.env',                                     // Environment files
    '.config',                                  // Generic Config files

    // Markup & Text
    '.md', '.markdown',                         // Markdown
    '.txt',                                     // Text
    '.rst',                                     // reStructuredText

    // Shell & Scripts
    '.sh', '.bash', '.zsh',                     // Shell scripts
    '.ps1',                                     // PowerShell
    '.bat',                                     // Batch

    // Database
    '.sql',                                     // SQL

    // Infrastructure & DevOps
    '.dockerfile', 'Dockerfile',                // Docker
    '.tf',                                      // Terraform
    '.hcl',                                     // HCL (Terraform, Packer)
    '.gradle',                                  // Gradle
    '.properties',                              // Java Properties

    // Other common types
    '.gitignore', // Often useful context
    // Add other extensions relevant to your projects
  ],

  // Maximum file size to include in content (in KB)
  maxFileSizeKB: 500,

  // Set to true to see the generated `find` command and other debug info
  debug: false
};
// --- END CONFIGURATION ---

// --- HELPER FUNCTIONS ---

/**
 * Checks if a file should have its content included based on its extension or name.
 * @param {string} filePath - The path to the file.
 * @returns {boolean} True if the content should be included, false otherwise.
 */
function shouldIncludeContent(filePath) {
  if (config.includeExtensions.length === 0) return true; // Include all if array is empty

  const fileExtension = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath); // Check full name for files like 'Dockerfile'

  return config.includeExtensions.some(extOrName => {
      if (extOrName.startsWith('.')) {
          // Match extension (case-insensitive)
          return fileExtension === extOrName.toLowerCase();
      } else {
          // Match exact filename (case-sensitive, adjust if needed for case-insensitivity)
          return fileName === extOrName;
      }
  });
}

/**
 * Gets the size of a file in kilobytes.
 * @param {string} filePath - The path to the file.
 * @returns {number} File size in KB, or 0 if error.
 */
function getFileSizeInKB(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size / 1024;
  } catch (error) {
    if (config.debug) {
        console.warn(`Debug: Could not get stats for file ${filePath}: ${error.message}`);
    }
    return 0;
  }
}

/**
 * Estimates the token count for a given text, optionally using file extension hints.
 * Uses a simple character-based heuristic.
 * @param {string} text - The text content.
 * @param {string} [fileExtOrName=''] - The file extension (e.g., '.js') or filename (e.g., 'Dockerfile').
 * @returns {number} Estimated token count.
 */
function estimateTokenCount(text, fileExtOrName = '') {
  // Simple heuristic: average 4 characters per token, slightly adjusted for known types
  const TOKENS_PER_CHAR = {
    // Code tends to be around 4 chars/token
    '.js': 0.25, '.jsx': 0.25, '.ts': 0.25, '.tsx': 0.25, '.mjs': 0.25, '.cjs': 0.25,
    '.py': 0.25, '.java': 0.25, '.cs': 0.25, '.php': 0.25, '.rb': 0.25, '.go': 0.25, '.rs': 0.25, '.swift': 0.25, '.kt': 0.25, '.kts': 0.25, '.dart': 0.25,
    '.scala': 0.25, '.lua': 0.25, '.pl': 0.25, '.c': 0.25, '.h': 0.25, '.cpp': 0.25, '.hpp': 0.25,
    '.vue': 0.25, '.svelte': 0.25,
    '.sh': 0.25, '.bash': 0.25, '.zsh': 0.25, '.ps1': 0.25, '.bat': 0.25,
    '.tf': 0.25, '.hcl': 0.25, '.gradle': 0.25, '.properties': 0.25,

    // Markup/Data often slightly denser or similar
    '.html': 0.24, '.htm': 0.24, '.xml': 0.24,
    '.css': 0.22, '.scss': 0.22, '.sass': 0.22, '.less': 0.22, // CSS slightly denser tokens
    '.sql': 0.26, // SQL keywords can be token-heavy

    // Config/Data formats - JSON is token heavy due to symbols/quotes
    '.json': 0.3,
    '.yml': 0.25, '.yaml': 0.25, '.toml': 0.25, '.ini': 0.25,
    '.env': 0.25, '.config': 0.25,
    '.dockerfile': 0.25, 'Dockerfile': 0.25,
    '.gitignore': 0.25,

    // Natural language / Prose is less dense (more chars/token)
    '.md': 0.18, '.markdown': 0.18, '.txt': 0.18, '.rst': 0.18,

    'default': 0.25 // Default average if type unknown
  };

  let tokensPerChar = TOKENS_PER_CHAR.default;
  const lowerExt = fileExtOrName.startsWith('.') ? fileExtOrName.toLowerCase() : path.extname(fileExtOrName).toLowerCase();
  const baseName = path.basename(fileExtOrName);

  if (lowerExt && TOKENS_PER_CHAR[lowerExt]) {
    tokensPerChar = TOKENS_PER_CHAR[lowerExt];
  } else if (TOKENS_PER_CHAR[baseName]) { // Check for exact filename match (like Dockerfile)
    tokensPerChar = TOKENS_PER_CHAR[baseName];
  }

  return Math.ceil(text.length * tokensPerChar);
}

/**
 * Gets the markdown language identifier from a file path extension or filename.
 * @param {string} filePath - The path to the file.
 * @returns {string} Markdown language identifier (e.g., 'javascript').
 */
function getLanguageFromExt(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const filename = path.basename(filePath); // For files like Dockerfile

  const langMap = {
    '.js': 'javascript', '.jsx': 'jsx', '.ts': 'typescript', '.tsx': 'tsx', '.mjs': 'javascript', '.cjs': 'javascript',
    '.py': 'python',
    '.java': 'java',
    '.cs': 'csharp',
    '.php': 'php',
    '.html': 'html', '.htm': 'html',
    '.css': 'css', '.scss': 'scss', '.sass': 'sass', '.less': 'less',
    '.vue': 'vue',
    '.svelte': 'svelte',
    '.json': 'json',
    '.md': 'markdown', '.markdown': 'markdown',
    '.txt': 'text', '.rst': 'rst',
    '.yml': 'yaml', '.yaml': 'yaml', '.toml': 'toml', '.ini': 'ini',
    '.xml': 'xml',
    '.sh': 'bash', '.bash': 'bash', '.zsh': 'zsh', '.ps1': 'powershell', '.bat': 'batch',
    '.sql': 'sql',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.swift': 'swift',
    '.kt': 'kotlin', '.kts': 'kotlin',
    '.dart': 'dart',
    '.scala': 'scala',
    '.lua': 'lua',
    '.pl': 'perl',
    '.c': 'c', '.h': 'c', '.cpp': 'cpp', '.hpp': 'cpp',
    '.env': 'dotenv',
    '.config': 'plaintext', // Or specify if a known config type
    '.dockerfile': 'dockerfile', 'Dockerfile': 'dockerfile',
    '.tf': 'terraform', '.hcl': 'hcl',
    '.gradle': 'gradle',
    '.properties': 'properties',
    '.gitignore': 'gitignore',
    // Add more mappings as needed
  };

  // Prioritize filename match, then extension match, then default
  return langMap[filename] || langMap[ext] || 'plaintext';
}

/**
 * Generates the list of files using the `find` command, applying include/exclude rules.
 * @returns {string[]} An array of file paths relative to the current directory.
 */
function generateFileList() {
  try {
    // Base command: find files, excluding ./ by default to avoid self-reference issues if script is in root
    let findCommand = `find . -path . -prune -o -type f`; // Exclude '.' itself, then find files

    // --- Build Exclusion Rules ---
    const excludePatterns = config.excludePaths.map(p => {
        const escapedPath = p.replace(/([*?"'\[\]{}() ])/g, '\\$1'); // More robust escaping

        if (escapedPath.includes('/')) {
            // Path relative to '.' (e.g., dist/specific, ./build)
            const cleanedPath = escapedPath.startsWith('./') ? escapedPath : `./${escapedPath}`;
            return `-path "${cleanedPath}" -o -path "${cleanedPath}/*"`;
        } else if (escapedPath.includes('*') || escapedPath.includes('?')) {
             // Wildcard name (e.g., *.log)
             return `-name "${escapedPath}"`;
        } else {
            // Simple name (e.g., node_modules, .git) - exclude file/dir with this name anywhere
            return `-name "${escapedPath}" -o -path "*/${escapedPath}/*"`;
        }
    }).filter(Boolean);

    if (excludePatterns.length > 0) {
      // Group exclusions and negate: -not \( pattern1 -o pattern2 ... \)
      findCommand += ` -not \\( ${excludePatterns.join(' -o ')} \\)`;
    }

    // --- Build Inclusion Rules ---
    // If includePaths is specified, *only* files matching these patterns are kept (after exclusions).
    const includePatterns = config.includePaths.map(p => {
        const escapedPath = p.replace(/([*?"'\[\]{}() ])/g, '\\$1');
        const cleanedPath = escapedPath.startsWith('./') ? escapedPath : `./${escapedPath}`;
        // Use -path for explicit paths/patterns relative to '.'
        return `-path "${cleanedPath}"`;
    }).filter(Boolean);

    if (includePatterns.length > 0) {
      // Group inclusions: \( pattern1 -o pattern2 ... \)
      findCommand += ` \\( ${includePatterns.join(' -o ')} \\)`;
    }

    // Add sorting and print command
    findCommand += ` -print | sort`;

    if (config.debug) {
        console.log("DEBUG: Running find command:");
        console.log(findCommand);
    }

    // Execute the command
    const output = execSync(findCommand, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }); // Increased buffer
    return output.split('\n').filter(line => line.trim() !== '');

  } catch (error) {
    console.error(`\n❌ Error generating file list with find command.`);
    // Attempt to provide more specific feedback based on error type
    if (error.stderr && error.stderr.includes('usage: find')) {
         console.error('Stderr suggests a syntax error in the generated find command.');
         console.error('Check your includePaths and excludePaths for invalid characters or patterns.');
    } else if (error.code === 'ENOBUFS' || (error.signal === 'SIGTERM' && error.message.includes('maxBuffer'))) {
        console.error('Error suggests the file list is too large for the command buffer.');
        console.error('Consider increasing maxBuffer further or refining excludePaths.');
    } else {
        console.error('An unexpected error occurred executing `find`.');
        if (error.stderr) console.error('Stderr:', error.stderr);
    }
    console.error(`Command attempted: ${error.cmd || findCommand}`); // Show command if available
    console.error('Error object:', error.message);
    console.error('\nPossible causes:');
    console.error(' - `find` command not available or not working as expected (e.g., Windows without WSL/Git Bash/Cygwin).');
    console.error(' - Incorrect syntax or unsupported patterns in includePaths/excludePaths.');
    console.error(' - Very large number of files or excessively long paths.');
    console.error('\nExiting due to error.');
    process.exit(1); // Exit the script
  }
}

/**
 * Generates a visual directory tree structure from a flat list of file paths.
 * @param {string[]} files - Array of file paths (e.g., './src/main.js').
 * @returns {string} A string representing the visual tree.
 */
function generateTreeStructure(files) {
    const cleanPaths = files.map(file => file.startsWith('./') ? file.substring(2) : file)
                            .filter(Boolean); // Remove empty strings if any

    const tree = {};

    // Build the tree object
    for (const filePath of cleanPaths) {
        const parts = filePath.split('/');
        let currentLevel = tree;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLastPart = i === parts.length - 1;

            if (isLastPart) {
                // It's a file - store in a special key (e.g., _files) to avoid name clashes
                if (!currentLevel._files) currentLevel._files = [];
                currentLevel._files.push(part);
            } else {
                // It's a directory
                if (!currentLevel[part]) currentLevel[part] = {}; // Create dir object if it doesn't exist
                currentLevel = currentLevel[part]; // Move deeper into the tree
            }
        }
    }

    // Recursive function to build the string representation
    function buildTreeString(node, prefix = '', isLastChild = true) {
        let result = '';
        // Get directory keys, excluding the special _files key
        const dirKeys = Object.keys(node).filter(key => key !== '_files').sort();
        const files = (node._files || []).sort(); // Get and sort files

        const totalItems = dirKeys.length + files.length;
        let currentItemIndex = 0;

        // Process directories first
        dirKeys.forEach(key => {
            currentItemIndex++;
            const isLast = currentItemIndex === totalItems;
            const connector = isLast ? '└── ' : '├── ';
            const indent = prefix + (isLastChild ? '    ' : '│   '); // Indent for children
            result += `${prefix}${connector}📁 ${key}/\n`;
            result += buildTreeString(node[key], indent, isLast); // Recurse
        });

        // Process files
        files.forEach(file => {
            currentItemIndex++;
            const isLast = currentItemIndex === totalItems;
            const connector = isLast ? '└── ' : '├── ';
             // Basic file icon, could be enhanced based on type
            const icon = '📄';
            result += `${prefix}${connector}${icon} ${file}\n`;
        });

        return result;
    }

    return buildTreeString(tree); // Start building from the root
}


/**
 * Cleans a file path by removing the leading './'.
 * @param {string} filePath - The file path.
 * @returns {string} The cleaned file path.
 */
function cleanPath(filePath) {
  return filePath.startsWith('./') ? filePath.substring(2) : filePath;
}

/**
 * Formats a file size (in KB) into a human-readable string (KB or MB).
 * @param {number} sizeInKB - Size in kilobytes.
 * @returns {string} Formatted size string.
 */
function formatFileSize(sizeInKB) {
  if (sizeInKB < 1) {
      return `${(sizeInKB * 1024).toFixed(0)} B`; // Show bytes for very small files
  } else if (sizeInKB < 1024) {
    return `${sizeInKB.toFixed(2)} KB`;
  } else {
    return `${(sizeInKB / 1024).toFixed(2)} MB`;
  }
}

/**
 * Formats a number with commas for better readability.
 * @param {number} num - The number to format.
 * @returns {string} Formatted number string.
 */
function formatNumber(num) {
  // Handle potential non-numeric input gracefully
  if (typeof num !== 'number' || isNaN(num)) {
      return String(num);
  }
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// --- MAIN EXECUTION ---

/**
 * Main function to generate the context file and statistics.
 */
function generateContextFile() {
  console.log("🔍 Finding relevant files...");
  const allFiles = generateFileList();

  if (allFiles.length === 0) {
      console.log("\n⚠️ No files found matching the criteria. Check your include/exclude paths and patterns.");
      console.log(`   - Include Paths: ${config.includePaths.join(', ') || '(all not excluded)'}`);
      console.log(`   - Exclude Paths: ${config.excludePaths.join(', ')}`);
      console.log(`   - Include Extensions: ${config.includeExtensions.join(', ') || '(all found files)'}`);
      if (config.debug) console.log("   (Debug mode is ON)");
      return; // Stop execution
  }

  console.log(`   Found ${allFiles.length} files. Processing...`);

  const stats = {
    totalFilesFound: allFiles.length,
    includedFileContents: 0, // Files whose content was actually included
    skippedFileContents: 0,  // Files whose content was skipped (size, type)
    skippedDueToSize: 0,
    skippedDueToType: 0,
    totalTokens: 0,          // Estimated total tokens for included content + structure
    totalCharacters: 0,      // Total characters in included file content
    totalOriginalSizeKB: 0,  // Sum of sizes of all *found* files
    filesByType: {},         // Count of all *found* files per extension/type
    tokensPerFileType: {},   // Estimated tokens per extension/type for *included* content
    includedContentSizeKB: 0 // Sum of sizes of files whose content was included
  };

  // --- Build Content ---
  const projectName = path.basename(process.cwd());
  let outputContent = `# Project Context: ${projectName}\n\n`;
  outputContent += `Generated: ${new Date().toISOString()}\n\n`;
  outputContent += `## Configuration Summary\n`;
  outputContent += `- Included Extensions: ${config.includeExtensions.length > 0 ? config.includeExtensions.join(', ') : 'All'}\n`;
  outputContent += `- Max File Size: ${config.maxFileSizeKB} KB\n`;
  // Optionally list excludes/includes if needed, but can be verbose
  // outputContent += `- Exclusions: ${config.excludePaths.join(', ')}\n`;
  outputContent += `\n`;


  // Add Directory Tree Section
  console.log("🌳 Generating directory structure...");
  outputContent += `## Directory Structure\n\n\`\`\`\n`;
  outputContent += generateTreeStructure(allFiles);
  outputContent += `\`\`\`\n\n`;

  // Add File Contents Section
  console.log("📄 Processing file contents...");
  outputContent += `## File Contents\n\n`;

  for (const filePath of allFiles) {
    const cleanFilePath = cleanPath(filePath);
    const fileExtOrName = path.extname(filePath).toLowerCase() || path.basename(filePath); // Use basename if no ext
    const fileSizeKB = getFileSizeInKB(filePath);

    // Update stats for *every* file found
    stats.totalOriginalSizeKB += fileSizeKB;
    if (!stats.filesByType[fileExtOrName]) {
      stats.filesByType[fileExtOrName] = 0;
      stats.tokensPerFileType[fileExtOrName] = 0; // Initialize token count
    }
    stats.filesByType[fileExtOrName]++;

    // --- Check if content should be included ---
    let skipReason = null;
    if (!shouldIncludeContent(filePath)) {
      skipReason = "Excluded by extension/type configuration";
      stats.skippedFileContents++;
      stats.skippedDueToType++;
    } else if (fileSizeKB > config.maxFileSizeKB) {
      skipReason = `File size ${formatFileSize(fileSizeKB)} exceeds ${config.maxFileSizeKB} KB limit`;
      stats.skippedFileContents++;
      stats.skippedDueToSize++;
    }

    // --- Add file section header ---
    // Use cleaned path for header
    outputContent += `### \`${cleanFilePath}\`\n\n`; // Use backticks for better rendering of paths

    if (skipReason) {
      outputContent += `*File content skipped: ${skipReason}*\n\n`;
      continue; // Move to the next file
    }

    // --- Read and add file content ---
    try {
      // Use original filePath for reading
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const language = getLanguageFromExt(filePath);

      // Update stats for included content
      stats.includedFileContents++;
      stats.includedContentSizeKB += fileSizeKB;
      const fileTokens = estimateTokenCount(fileContent, fileExtOrName);
      stats.totalTokens += fileTokens;
      stats.totalCharacters += fileContent.length;
      stats.tokensPerFileType[fileExtOrName] += fileTokens; // Add tokens to the correct type

      // Add content to output
      // Use simplified markers with cleaned path
      outputContent += `\`\`\`${language}\n`; // Start code block immediately
      outputContent += fileContent.trim() ? fileContent : `[EMPTY FILE]`; // Handle empty files
      outputContent += `\n\`\`\`\n\n`; // End code block and add spacing

    } catch (error) {
      stats.skippedFileContents++; // Count as skipped if read error
      outputContent += `*Error reading file: ${error.message}*\n\n`;
      console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
    }
  }

  // Estimate tokens for the non-content parts (headers, structure, etc.)
  // This is a rough estimate; treat the structure itself as markdown.
  const structureOnlyContent = outputContent.replace(/```[\s\S]*?```/g, ''); // Remove code blocks temporarily
  const structureTokens = estimateTokenCount(structureOnlyContent, '.md');
  stats.totalTokens += structureTokens; // Add overhead estimate

  // --- Finalize and Write Output ---
  console.log(`💾 Writing output to ${config.outputFile}...`);
  try {
      fs.writeFileSync(config.outputFile, outputContent);
  } catch (error) {
      console.error(`\n❌ Error writing output file ${config.outputFile}: ${error.message}`);
      process.exit(1);
  }


  // --- Calculate and Print Statistics ---
  console.log("📊 Calculating statistics...");
  const outputFileSizeKB = getFileSizeInKB(config.outputFile);

  // --- DETAILED CONSOLE OUTPUT ---
  console.log("\n" + "=".repeat(60));
  console.log(`📊 CONTEXT FILE GENERATION REPORT`);
  console.log("=".repeat(60));
  console.log(`Project: ${projectName}`);
  console.log(`Output File: ${config.outputFile}`);
  console.log(`Timestamp: ${new Date().toLocaleString()}`);
  console.log("-".repeat(60));

  console.log(`📝 Output File Summary:`);
  console.log(`  • Final Size: ${formatFileSize(outputFileSizeKB)}`);
  console.log(`  • Estimated Tokens: ~${formatNumber(stats.totalTokens)}`);
  console.log(`  • Included Characters: ${formatNumber(stats.totalCharacters)}`);
  console.log(`  • Structure/Overhead Tokens: ~${formatNumber(structureTokens)}`);

  console.log(`\n📁 File Processing Summary:`);
  console.log(`  • Total files scanned: ${stats.totalFilesFound}`);
  console.log(`  • File content included: ${stats.includedFileContents}`);
  console.log(`  • File content skipped: ${stats.skippedFileContents}`);
  if (stats.skippedDueToSize > 0) {
    console.log(`    - Skipped (size limit): ${stats.skippedDueToSize}`);
  }
  if (stats.skippedDueToType > 0) {
    console.log(`    - Skipped (type/extension): ${stats.skippedDueToType}`);
  }
  console.log(`  • Total size of scanned files: ${formatFileSize(stats.totalOriginalSizeKB)}`);
  console.log(`  • Total size of included content: ${formatFileSize(stats.includedContentSizeKB)}`);


  console.log(`\n📊 Top 5 File Types by Included Content Tokens:`);
  const topFileTypesByTokens = Object.entries(stats.tokensPerFileType)
    .filter(([, tokens]) => tokens > 0) // Only show types with included content
    .sort((a, b) => b[1] - a[1]) // Sort descending by tokens
    .slice(0, 5);

  if (topFileTypesByTokens.length > 0) {
      topFileTypesByTokens.forEach(([extOrName, tokens]) => {
        // Find the count of *included* files of this type (approximation)
        // More accurate tracking would require storing included counts per type
        const totalFoundCount = stats.filesByType[extOrName] || 0;
        // Estimate included count - assumes most files of this type were included if tokens > 0
        // A more precise count isn't easily available without more complex tracking
        console.log(`  • ${extOrName || '(no ext/other)'}: ~${formatNumber(tokens)} tokens (${totalFoundCount} files found)`);
      });
      if (Object.keys(stats.tokensPerFileType).length > 5) {
          console.log("  • ... (other file types)");
      }
  } else {
      console.log("  • No file content was included based on current settings.");
  }


  console.log(`\n📈 Estimated Model Context Usage:`);
  // NOTE: Context limits are based on publicly advertised maximums as of April 2025.
  // These can change and may vary slightly in specific API implementations or pricing tiers.
  const models = [
    // Anthropic - Using user's original naming convention + latest known limits
    { name: "Claude 3.5 Sonnet", limit: 200000 },
    { name: "Claude 3.7 Sonnet", limit: 200000 }, // Using 200k based on search results
    { name: "Claude 3.7 MAX", limit: 200000 },    // Using 200k based on search results & original script context

    // OpenAI
    { name: "GPT-4o", limit: 128000 },
    { name: "GPT-4 Turbo", limit: 128000 },

    // Google
    { name: "Gemini 1.5 Pro", limit: 1000000 }, // Standard 1M, 2M available via API
    { name: "Gemini 1.5 Flash", limit: 1000000 },
  ];

  models.forEach(model => {
    const percentUsed = Math.min(100, (stats.totalTokens / model.limit) * 100); // Cap at 100%
    // Determine status: ❌ Over limit, ⚠️ Over 70%, ✅ OK
    const statusSymbol = stats.totalTokens > model.limit ? "❌" : percentUsed > 70 ? "⚠️" : "✅";
    console.log(`  ${statusSymbol} ${model.name}: ${percentUsed.toFixed(1)}% used (~${formatNumber(stats.totalTokens)} / ${formatNumber(model.limit)} tokens)`);
  });

  console.log("\n💰 Estimated Cost Comparison (Input Tokens / Tool Calls):");
  // Rough cost estimation based on input tokens (check current pricing)
  // Note: Output tokens also cost. MAX models often have flat fees or per-call charges.
  // Using placeholder costs based on original script/common examples - VERIFY CURRENT PRICING
  const costs = [
    // Per-token models (Input cost per 1M tokens - EXAMPLE PRICING ~Apr 2025)
    { name: "Claude 3.5/3.7 Sonnet ($3/M)", cost: (stats.totalTokens / 1000000) * 3 },
    { name: "GPT-4o ($5/M)", cost: (stats.totalTokens / 1000000) * 5 },
    { name: "Gemini 1.5 Pro ($3.5/M or $7/M)", cost: (stats.totalTokens / 1000000) * 3.5 }, // Example pricing

    // MAX / Tool-using models (Approximate cost using this script vs. individual file reads)
    // Using $0.05 per call as a placeholder based on original script comment - VERIFY CURRENT PRICING
    { name: "Cursor MAX (This Script)", cost: 0.05 }, // Placeholder: Assumed single prompt fee
    { name: "Cursor MAX (File Reads)", cost: Math.max(0.05, 0.05 * stats.includedFileContents) }, // Placeholder: $0.05 per file read tool call
  ];

  costs.forEach(model => {
    console.log(`  • ${model.name}: ~$${model.cost.toFixed(4)}`);
  });

  // Show potential savings vs tool calls (using placeholder cost)
  const toolCallCost = Math.max(0.05, 0.05 * stats.includedFileContents);
  const scriptCost = 0.05; // Placeholder single prompt cost
  if (toolCallCost > scriptCost && stats.includedFileContents > 1) {
      const savingsAmount = toolCallCost - scriptCost;
      // Prevent division by zero if toolCallCost is 0 (though unlikely with Math.max)
      const savingsPercent = toolCallCost > 0 ? (savingsAmount / toolCallCost) * 100 : 0;
      console.log(`\n💸 Potential Tool Call Savings (Example: Cursor MAX @ $0.05/call):`);
      console.log(`  • Est. Cost w/ File Reads: ~$${toolCallCost.toFixed(2)} (${stats.includedFileContents} included files)`);
      console.log(`  • Est. Cost w/ This Script: ~$${scriptCost.toFixed(2)} (1 prompt)`);
      console.log(`  • Potential Savings: ~$${savingsAmount.toFixed(2)} (${savingsPercent.toFixed(0)}%)`);
      console.log(`  (Note: Verify actual tool call costs for your specific AI provider)`);
  }


  console.log("=".repeat(60));
  console.log(`✨ Done! Copy the contents of ${config.outputFile} into your AI chat.`);
  console.log("   Remember to use the custom instructions from the README.md for best results.");
  console.log("=".repeat(60) + "\n");
}

// --- Run the generator ---
generateContextFile();
