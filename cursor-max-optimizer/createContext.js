#!/usr/bin/env node

/**
 * AI Context Optimization : Comprehensive Context Creation Tool
 * ------------------------------
 * A tool for generating comprehensive code context for AI assistants while minimizing token costs.
 *
 * This script creates a single markdown file containing your entire codebase structure and content,
 * which can be pasted directly into AI chat interfaces to provide
 * complete project context in one go.
 *
 * BENEFITS:
 * - Save money: Can reduce costs compared to multiple individual file processing calls by some AI services.
 * - Better context: Provides the AI with a more complete view of your project at once.
 * - Privacy control: Only includes files you want, respecting custom exclusions.
 * - Performance stats: Shows token counts and file details.
 *
 * USAGE:
 * 1. Configure the excludePaths, includePaths, and includeExtensions in the config object below
 * 2. Run: node createContext.js
 * 3. Copy the generated context.md into your AI chat
 *
 * Created by: Ghazi Khan (mgks.dev)
 * Version: 0.2.9
 *
 * CHANGELOG:
 * - v0.2.9: (2025-06-15)
 *   - MAJOR FIX: Completely overhauled the `find` command generation logic in `generateDirectoryTreeAsync`.
 *   - The new logic chains individual `-not` conditions for each exclusion pattern, which is more robust and avoids complex boolean grouping errors.
 *   - Directory exclusion (e.g., 'build/') now correctly creates a `-path '* /build/ *'` condition, effectively excluding that directory name and its contents at any depth (e.g., './build/' and './app/build/').
 *   - This directly resolves the issue where `build/` in `excludePaths` was failing to exclude nested build directories.
 *
 * - v0.2.3: (2025-05-27)
 *   - Streamlined console output: Removed AI model-specific token usage comparisons and cost estimations.
 *   - Focused output on file statistics, token counts, and structural information.
 *   - Refined final messages to be more generic.
 *
 * - v0.2.2 (2025-04-23):
 *   - Fixed .git directory exclusion by refining `find` command logic for literal paths vs. globs.
 *   - Added common Android project file extensions to `includeExtensions` (e.g., .java, .kt, .xml, .gradle).
 *   - Added support for including files without extensions (e.g., `gradlew`) by allowing `''` in `includeExtensions`.
 *   - Enhanced `getLanguageFromExt` to recognize more Android-specific file types and handle extensionless files like `gradlew`.
 *   - Improved escaping in `find` command generation for robustness.
 *   - Minor updates to default `excludePaths` for typical Android projects.
 *
 * - v0.2.1: (2025-04-22)
 *   - Revised `find` command logic to previous with 0.2.0 improvements, it basically made the script useless.
 *
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
 *
 * - v0.1.0: Initial release.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const outputFileName = 'context.md';

const config = {
  outputFile: outputFileName,
  includePaths: [],
  excludePaths: [
    outputFileName, 'createContext.js', '.DS_Store', 'node_modules', 'vendor',
    '*.apk', '*.aab', '*.iml', '.env', '*.log', '*.lock', '.gitignore',
    'captures/', 'proguard-rules.pro', 'LICENSE', 'CODE_OF_CONDUCT.md', 'CONTRIBUTING.md', 'PLUGINS.md',
    // Key directories to exclude, now handled correctly
    '.github/', 'dist/', 'build/', '.gradle/',
    // Android-specific files
    'gradle.properties', 'gradlew', 'gradlew.bat', 'local.properties', 'settings.gradle',
  ],
  includeExtensions: [
    '.js', '.jsx', '.ts', '.tsx', '.php', '.html', '.css', '.scss',
    '.json', '.md', '.txt', '.yml', '.yaml', '.config', '.py',
    '.java', '.kt', '.kts', '.xml', '.gradle', '.pro',
    '.c', '.cpp', '.h', '.hpp'
  ],
  maxFileSizeKB: 500,
  debug: false // Set to true to see the generated `find` command
};

async function generateDirectoryTreeAsync() {
    // This new approach builds a more robust `find` command by chaining `-not`
    // conditions instead of grouping them all under a single `-not (...)`.
    // This avoids complex boolean logic and is easier to debug and verify.

    let findCommandParts = [
        "find .",
        // First, efficiently prune all hidden directories (like .git, .vscode) and their contents.
        "\\( -path '*/.*' -prune \\)",
        "-o",
        // The main expression for finding files starts here.
        "\\( -type f" // We only want files.
    ];

    // --- Exclusion Logic ---
    // Add a `-not` condition for each exclusion pattern. This is the core of the fix.
    if (config.excludePaths.length > 0) {
        config.excludePaths.forEach(p => {
            // Basic escape for single quotes in patterns, though unlikely.
            const pattern = p.replace(/'/g, "'\\''");

            let condition;
            if (pattern.endsWith('/')) {
                // For 'build/', creates `-path '*/build/*'`. Excludes dir and its contents anywhere.
                const dirName = pattern.slice(0, -1);
                condition = `-path '*/${dirName}/*'`;
            } else if (pattern.startsWith('*.')) {
                // For '*.apk'`, creates `-name '*.apk'`.
                condition = `-name '${pattern}'`;
            } else if (!pattern.includes('/') && !pattern.includes('.')) {
                // For 'node_modules', creates `-not \( -name 'node_modules' -o -path '*/node_modules/*' \)`
                // This excludes the directory itself or any file within it.
                condition = `\\( -name '${pattern}' -o -path '*/${pattern}/*' \\)`;
            } else {
                // For specific files like 'createContext.js' or 'path/to/file.js'.
                if (pattern.includes('/')) {
                    condition = `-path './${pattern}'`; // Match exact path
                } else {
                    condition = `-name '${pattern}'`; // Match file name anywhere
                }
            }
            findCommandParts.push(`-not ${condition}`);
        });
    }

    // --- Inclusion Logic ---
    // If includePaths is specified, we add a block that matches ANY of them.
    if (config.includePaths.length > 0) {
        const includeArgs = config.includePaths.map(p => {
            const pattern = p.replace(/'/g, "'\\''");
            const cleanedPath = pattern.startsWith('./') ? pattern : `./${pattern}`;
            // Match the path itself or anything inside it if it's a directory.
            return `\\( -path '${cleanedPath}' -o -path '${cleanedPath}/*' \\)`;
        }).join(' -o ');

        // Add the inclusion block with `-a` (AND)
        findCommandParts.push(`-a \\( ${includeArgs} \\)`);
    }

    // Finish the command
    findCommandParts.push("-print \\)"); // End the main expression and print results
    findCommandParts.push("| sort");
    const findCommand = findCommandParts.join(' ');

    if (config.debug) {
        console.log("DEBUG: Running find command:");
        console.log(findCommand);
    }

    return new Promise((resolve) => {
        exec(findCommand, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (config.debug && stderr && stderr.trim().length > 0) {
                console.warn("DEBUG: `find` command emitted to STDERR (these are often permission errors and can sometimes be ignored):");
                console.warn("<<<<<<<<<< FIND STDERR START >>>>>>>>>>");
                console.warn(stderr.trim());
                console.warn("<<<<<<<<<< FIND STDERR END >>>>>>>>>>");
            }
            if (error) {
                console.error(`\n❌ Error executing find command (exit code ${error.code}). This may happen if no files match.`);
                if (stdout && stdout.trim().length > 0 && config.debug) {
                    console.log("DEBUG: Partial STDOUT from failed find command:", stdout.trim());
                }
                // Resolve with what we got, even if it's an empty list.
                resolve(stdout ? stdout.split('\n').filter(line => line.trim() !== '') : []);
                return;
            }
            const files = stdout.split('\n').filter(line => line.trim() !== '');
            resolve(files);
        });
    });
}


function shouldIncludeBasedOnExtension(filePath) {
  if (config.includeExtensions.length === 0) return true;
  const ext = path.extname(filePath).toLowerCase();
  return config.includeExtensions.includes(ext);
}

function getFileSizeInKB(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile() ? stats.size / 1024 : 0;
  } catch (error) {
    return 0;
  }
}

function estimateTokenCount(text) {
    return Math.ceil(text.length * 0.25);
}

function getLanguageFromExt(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const filename = path.basename(filePath).toLowerCase();

  if (filename === 'gradlew') return 'bash';
  if (filename === 'proguard-rules.pro' || ext === '.pro') return 'properties';
  if (filename.startsWith('readme')) return 'markdown';
  if (filename === 'license') return 'text';

  const langMap = {
    '.js': 'javascript', '.jsx': 'jsx', '.ts': 'typescript', '.tsx': 'tsx',
    '.php': 'php', '.html': 'html', '.css': 'css', '.scss': 'scss',
    '.json': 'json', '.md': 'markdown', '.txt': 'text', '.yml': 'yaml',
    '.yaml': 'yaml', '.sh': 'bash', '.py': 'python', '.java': 'java',
    '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.hpp': 'cpp', '.cs': 'csharp',
    '.rb': 'ruby', '.go': 'go', '.rs': 'rust', '.swift': 'swift',
    '.kt': 'kotlin', '.kts': 'kotlin', '.dart': 'dart', '.sql': 'sql',
    '.env': 'dotenv', '.config': 'plaintext', '.xml': 'xml', '.gradle': 'groovy',
  };
  return langMap[ext] || 'plaintext';
}

function generateTreeStructure(files) {
    if (!files || files.length === 0) return "[No files to display]";
    const tree = {};
    files.forEach(file => {
        const parts = file.startsWith('./') ? file.substring(2).split('/') : file.split('/');
        let current = tree;
        parts.forEach((part, i) => {
            const isFile = i === parts.length - 1;
            if (isFile) {
                current.files = current.files || [];
                current.files.push(part);
            } else {
                current.dirs = current.dirs || {};
                current[part] = current[part] || {};
                current = current[part];
            }
        });
    });

    const buildTree = (node, prefix = '') => {
        let result = '';
        const dirs = Object.keys(node).filter(k => k !== 'files').sort();
        const files = (node.files || []).sort();
        dirs.forEach((dir, i) => {
            const isLast = i === dirs.length - 1 && files.length === 0;
            result += `${prefix}${isLast ? '└── ' : '├── '}📁 ${dir}/\n`;
            result += buildTree(node[dir], `${prefix}${isLast ? '    ' : '│   '}`);
        });
        files.forEach((file, i) => {
            const isLast = i === files.length - 1;
            result += `${prefix}${isLast ? '└── ' : '├── '}📄 ${file}\n`;
        });
        return result;
    };
    return buildTree(tree).replace(/\[object Object\]/g, ''); // Fix for nested structure bug
}

function formatFileSize(sizeInKB) {
  if (sizeInKB < 0.01 && sizeInKB > 0) return "< 0.01 KB";
  if (sizeInKB === 0) return "0 KB";
  return sizeInKB < 1024 ? `${sizeInKB.toFixed(2)} KB` : `${(sizeInKB / 1024).toFixed(2)} MB`;
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function generateContextFile() {
  console.log("🔍 Finding relevant files...");
  const initialFiles = await generateDirectoryTreeAsync();

  if (initialFiles.length === 0) {
      console.log("\n⚠️ No files found that match your criteria.");
      console.log("   Check `includePaths`, `excludePaths`, and `includeExtensions` in your config.");
      console.log("   Or, run with `debug: true` to see the exact `find` command used.");
      return;
  }

  console.log(`   Found ${initialFiles.length} potential files. Filtering by extension...`);

  const filesToProcess = initialFiles.filter(shouldIncludeBasedOnExtension);

  if (filesToProcess.length === 0) {
      console.log(`\n⚠️ No files remaining after filtering by 'includeExtensions'.`);
      console.log(`   Initial find found ${initialFiles.length} files, but none had the required extensions.`);
      return;
  }
  console.log(`   Processing ${filesToProcess.length} files...`);

  const stats = { totalFilesFound: initialFiles.length, totalFilesProcessed: filesToProcess.length, includedFileContents: 0, skippedDueToSize: 0, skippedOther: 0, totalTokens: 0, totalOriginalSizeKB: 0 };
  const projectName = path.basename(process.cwd());
  let outputContent = `# Project Context: ${projectName}\n\nGenerated: ${new Date().toISOString()}\n\n`;
  outputContent += `## Directory Structure\n\n\`\`\`\n${generateTreeStructure(filesToProcess)}\`\`\`\n\n`;
  outputContent += `## File Contents\n\n`;

  for (const filePath of filesToProcess) {
    const currentFileSizeKB = getFileSizeInKB(filePath);
    stats.totalOriginalSizeKB += currentFileSizeKB;

    if (currentFileSizeKB > config.maxFileSizeKB) {
      stats.skippedDueToSize++;
      outputContent += `### \`${filePath}\`\n\n*File content skipped: Size ${formatFileSize(currentFileSizeKB)} exceeds ${config.maxFileSizeKB} KB limit.*\n\n`;
      continue;
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const language = getLanguageFromExt(filePath);
      stats.includedFileContents++;
      stats.totalTokens += estimateTokenCount(fileContent);
      outputContent += `### \`${filePath}\`\n\n\`\`\`${language}\n${fileContent.trim() ? fileContent : '[EMPTY FILE]'}\n\`\`\`\n\n`;
    } catch (error) {
      stats.skippedOther++;
      outputContent += `### \`${filePath}\`\n\n*Error reading file: ${error.message}*\n\n`;
      console.warn(`Warning on ${filePath}: ${error.message}`);
    }
  }

  const structureTokens = estimateTokenCount(outputContent.replace(/```[^`]*?\n[\s\S]*?\n```/g, ''));
  stats.totalTokens += structureTokens;

  fs.writeFileSync(config.outputFile, outputContent);
  console.log(`\n💾 Writing output to ${config.outputFile}...`);
  const outputFileSizeKB = getFileSizeInKB(config.outputFile);

  console.log("\n" + "=".repeat(60));
  console.log("📊 CONTEXT FILE STATISTICS");
  console.log("=".repeat(60));
  console.log(`  • Context file created: ${config.outputFile} (${formatFileSize(outputFileSizeKB)})`);
  console.log(`  • Estimated total tokens: ~${formatNumber(stats.totalTokens)}`);
  console.log(`\n  • Files found by search: ${stats.totalFilesFound}`);
  console.log(`  • Files processed (after ext filter): ${stats.totalFilesProcessed}`);
  console.log(`  • Content included: ${stats.includedFileContents} files`);
  console.log(`  • Skipped (size > ${config.maxFileSizeKB}KB): ${stats.skippedDueToSize} files`);
  console.log(`  • Skipped (read errors): ${stats.skippedOther} files`);
  console.log("=".repeat(60));
  console.log("✨ Done!");
}

generateContextFile().catch(err => {
    console.error("\n❌ An unexpected error occurred:", err);
});
