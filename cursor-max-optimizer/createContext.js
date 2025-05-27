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
 * Version: 0.2.3
 *
 * CHANGELOG:
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
const { execSync } = require('child_process');

// Define the output file name outside the config object so we can reference it
const outputFileName = 'context.md';

// CONFIGURATION - Edit these variables as needed
const config = {
  outputFile: outputFileName,
  includePaths: [],
  excludePaths: [
    outputFileName, 'createContext.js',
    '.DS_Store', 'node_modules', '.git', '.hg', '.svn', 'dist', 'build', 'vendor',
    '.gitignore', '.env', '*.log', '*.lock',
    '.idea', '.gradle', 'local.properties', '*.apk', '*.aab', '*.iml', 'build/', 'captures/',
  ],
  includeExtensions: [
    '.js', '.jsx', '.ts', '.tsx', '.php', '.html', '.css', '.scss',
    '.json', '.md', '.txt', '.yml', '.yaml', '.config', '.py',
    '.java', '.kt', '.kts', '.xml', '.gradle', '.pro',
    '.c', '.cpp', '.h', '.hpp',
    '',
  ],
  maxFileSizeKB: 500,
  debug: false
};

// (generateDirectoryTree function remains the same as in the previous version)
function generateDirectoryTree() {
  try {
    const excludeFindArgs = config.excludePaths.map(p => {
        let condition;
        if (p.startsWith('*.')) { // Glob patterns like *.log, *.apk
            condition = `-name "${p}"`;
        } else {
            const literalPattern = p.replace(/([*?\[\]\\])/g, '\\$1');
            if (p.includes('/') || p.endsWith('/')) {
                let cleanedPath = literalPattern;
                if (cleanedPath.endsWith('/')) {
                    cleanedPath = cleanedPath.slice(0, -1);
                }
                cleanedPath = cleanedPath.startsWith('./') ? cleanedPath : `./${cleanedPath}`;
                condition = `-path "${cleanedPath}" -o -path "${cleanedPath}/*"`;
            } else {
                condition = `-name "${literalPattern}" -o -path "./${literalPattern}/*"`;
            }
        }
        return `\\( ${condition} \\)`;
    }).filter(Boolean);

    // Prioritize pruning .git directly
    let findCommand = `find . -type d -name .git -prune -o -type f`;

    if (excludeFindArgs.length > 0) {
      const relevantExcludeArgs = excludeFindArgs.filter(arg => !arg.includes("-name \".git\"") && !arg.includes("-path \"./.git/*\""));
      if (relevantExcludeArgs.length > 0) {
        findCommand += ` -not \\( ${relevantExcludeArgs.join(' -o ')} \\)`;
      }
    }

    if (config.includePaths.length > 0) {
        const includeArgs = config.includePaths.map(dirOrFile => {
            const literalDirOrFile = dirOrFile.replace(/([*?\[\]\\])/g, '\\$1');
            const cleanedPath = literalDirOrFile.startsWith('./') ? literalDirOrFile : `./${literalDirOrFile}`;
            if (fs.existsSync(cleanedPath) && fs.statSync(cleanedPath).isFile()) {
                return `-path "${cleanedPath}"`;
            } else {
                return `\\( -path "${cleanedPath}" -o -path "${cleanedPath}/*" \\)`;
            }
        }).join(' -o ');
        findCommand += ` \\( ${includeArgs} \\)`;
    }

    findCommand += ` | sort`;

    if (config.debug) {
        console.log("DEBUG: Running find command:");
        console.log(findCommand);
    }

    const output = execSync(findCommand, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    return output.split('\n').filter(line => line.trim() !== '');

  } catch (error) {
    let findCmdForError = error.cmd || ''; // Use error.cmd if available
    if (!findCmdForError && typeof findCommand === 'string') { findCmdForError = findCommand; } // Fallback to constructed command

    console.error(`\n❌ Error generating directory tree with find command.`);
    if (config.debug && findCmdForError) { console.error(`Command attempted: ${findCmdForError}`); }
    if (error.stderr) { console.error('Stderr:', error.stderr); }
    console.error('Error:', error.message);
    return [];
  }
}

// (shouldIncludeBasedOnExtension function remains the same)
function shouldIncludeBasedOnExtension(filePath) {
  if (config.includeExtensions.length === 0) return true;
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '' && config.includeExtensions.includes('')) {
    return true;
  }
  return config.includeExtensions.includes(ext);
}

// (getFileSizeInKB function remains the same)
function getFileSizeInKB(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size / 1024;
  } catch (error) {
    return 0;
  }
}

// (estimateTokenCount function remains the same)
function estimateTokenCount(text, fileExt = '') {
  const TOKENS_PER_CHAR = {
    '.js': 0.25, '.jsx': 0.25, '.ts': 0.25, '.tsx': 0.25, '.php': 0.25,
    '.html': 0.25, '.css': 0.22, '.scss': 0.22, '.json': 0.3, '.md': 0.18,
    '.txt': 0.18, '.yml': 0.25, '.yaml': 0.25, '.py': 0.25, '.env': 0.25,
    '.java': 0.25, '.kt': 0.26, '.kts': 0.26, '.xml': 0.28,
    '.gradle': 0.25, '.pro': 0.22, '.c': 0.25, '.cpp': 0.25, '.h': 0.25,
    'default': 0.25,
    '': 0.20
  };
  let tokensPerChar = TOKENS_PER_CHAR.default;
  if (TOKENS_PER_CHAR[fileExt] !== undefined) {
    tokensPerChar = TOKENS_PER_CHAR[fileExt];
  }
  return Math.ceil(text.length * tokensPerChar);
}

// (getLanguageFromExt function remains the same)
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
    '.yaml': 'yaml', '.sh': 'bash', '.bash': 'bash', '.py': 'python',
    '.java': 'java', '.c': 'c', '.cpp': 'cpp', '.cs': 'csharp', '.rb': 'ruby',
    '.go': 'go', '.rs': 'rust', '.swift': 'swift', '.kt': 'kotlin', '.kts': 'kotlin',
    '.dart': 'dart', '.sql': 'sql', '.env': 'dotenv', '.config': 'plaintext',
    '.xml': 'xml', '.gradle': 'groovy',
    '.h': 'c', '.hpp': 'cpp',
  };
  return langMap[ext] || 'plaintext';
}

// (generateTreeStructure function remains the same)
function generateTreeStructure(files) {
  const cleanPaths = files.map(file => file.startsWith('./') ? file.substring(2) : file);
  const tree = {};
  for (const file of cleanPaths) {
    const parts = file.split('/');
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      if (isFile) {
        if (!current.files) current.files = [];
        current.files.push(part);
      } else {
        if (!current.dirs) current.dirs = {};
        if (!current.dirs[part]) current.dirs[part] = {};
        current = current.dirs[part];
      }
    }
  }
  function printTree(node, prefix = '', isLast = true) {
    let result = '';
    if (node.dirs) {
      const dirs = Object.keys(node.dirs).sort();
      dirs.forEach((dir, index) => {
        const isLastDir = index === dirs.length - 1 && (!node.files || node.files.length === 0);
        result += `${prefix}${isLastDir ? '└── ' : '├── '}📁 ${dir}/\n`;
        result += printTree(node.dirs[dir], `${prefix}${isLastDir ? '    ' : '│   '}`, isLastDir);
      });
    }
    if (node.files) {
      node.files.sort();
      node.files.forEach((file, index) => {
        const isLastFile = index === node.files.length - 1;
        result += `${prefix}${isLastFile ? '└── ' : '├── '}📄 ${file}\n`;
      });
    }
    return result;
  }
  return printTree(tree);
}

// (formatFileSize function remains the same)
function formatFileSize(sizeInKB) {
  if (sizeInKB < 0.01 && sizeInKB > 0) return "< 0.01 KB";
  if (sizeInKB === 0) return "0 KB";
  if (sizeInKB < 1024) {
    return `${sizeInKB.toFixed(2)} KB`;
  } else {
    return `${(sizeInKB / 1024).toFixed(2)} MB`;
  }
}

// (formatNumber function remains the same)
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}


// *** MODIFIED FUNCTION (Output Section) ***
function generateContextFile() {
  console.log("🔍 Finding relevant files...");
  const initialFiles = generateDirectoryTree();

  if (initialFiles.length === 0 && !config.debug) {
      console.log("\n⚠️ No files found by the 'find' command. Check path configurations or run with debug:true.");
      return;
  }

  console.log(`   Found ${initialFiles.length} files initially. Filtering by extension...`);
  const filesToProcess = initialFiles.filter(filePath => shouldIncludeBasedOnExtension(filePath));

  if (filesToProcess.length === 0) {
      console.log("\n⚠️ No files found matching the path *and* extension criteria. Check your excludePaths, includePaths, and includeExtensions in the config.");
      if (config.debug) console.log(`   Initial files from find: ${initialFiles.join(', ')}`)
      return;
  }
  console.log(`   ${filesToProcess.length} files match extension criteria. Processing...`);

  const stats = {
    totalFilesFoundInitial: initialFiles.length,
    totalFilesProcessed: filesToProcess.length,
    includedFileContents: 0,
    skippedFileContents: 0,
    skippedDueToSize: 0,
    totalTokens: 0,
    totalCharacters: 0,
    totalOriginalSizeKB: 0,
    filesByType: {},
    tokensPerFileType: {}
  };

  const projectName = path.basename(process.cwd());
  let outputContent = `# Project Context: ${projectName}\n\nGenerated: ${new Date().toISOString()}\n\n`;

  console.log("🌳 Generating directory structure...");
  outputContent += `## Directory Structure\n\n\`\`\`\n`;
  outputContent += generateTreeStructure(filesToProcess);
  outputContent += `\`\`\`\n\n`;

  console.log("📄 Processing file contents...");
  outputContent += `## File Contents\n\n`;

  for (const filePath of filesToProcess) {
    const fileExt = path.extname(filePath).toLowerCase();

    const currentFileSizeKB = getFileSizeInKB(filePath);
    stats.totalOriginalSizeKB += currentFileSizeKB;
    if (!stats.filesByType[fileExt]) {
      stats.filesByType[fileExt] = 0;
      stats.tokensPerFileType[fileExt] = 0;
    }
    stats.filesByType[fileExt]++;

    if (currentFileSizeKB > config.maxFileSizeKB) {
      stats.skippedFileContents++;
      stats.skippedDueToSize++;
      outputContent += `### \`${filePath}\`\n\n*File content skipped: Size ${formatFileSize(currentFileSizeKB)} exceeds ${config.maxFileSizeKB} KB limit.*\n\n`;
      continue;
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const language = getLanguageFromExt(filePath);

      stats.includedFileContents++;
      const fileTokens = estimateTokenCount(fileContent, fileExt);
      stats.totalTokens += fileTokens;
      stats.totalCharacters += fileContent.length;
      stats.tokensPerFileType[fileExt] += fileTokens;

      outputContent += `### \`${filePath}\`\n\n`;
      outputContent += `\`\`\`${language}\n`;
      outputContent += fileContent.trim() ? fileContent : '[EMPTY FILE]';
      outputContent += `\n\`\`\`\n\n`;
    } catch (error) {
      stats.skippedFileContents++;
      outputContent += `### \`${filePath}\`\n\n*Error reading file: ${error.message}*\n\n`;
      console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
    }
  }

  const structureMarkdown = outputContent.replace(/```[^`]*?\n[\s\S]*?\n```/g, '');
  const structureTokens = estimateTokenCount(structureMarkdown, '.md');
  stats.totalTokens += structureTokens;

  fs.writeFileSync(config.outputFile, outputContent);
  console.log(`💾 Writing output to ${config.outputFile}...`);

  const outputFileSizeKB = getFileSizeInKB(config.outputFile);

  console.log("\n" + "=".repeat(60));
  console.log(`📊 CONTEXT FILE STATISTICS`);
  console.log("=".repeat(60));
  console.log(`📝 Content Summary:`);
  console.log(`  • Context file created: ${config.outputFile}`);
  console.log(`  • File size: ${formatFileSize(outputFileSizeKB)}`);
  console.log(`  • Estimated total tokens: ~${formatNumber(stats.totalTokens)}`);
  console.log(`  • Characters (content only): ${formatNumber(stats.totalCharacters)}`);
  console.log(`  • Markdown overhead (est.): ~${formatNumber(structureTokens)} tokens`);

  console.log(`\n📁 File Processing:`);
  console.log(`  • Files found by path search: ${stats.totalFilesFoundInitial}`);
  console.log(`  • Files matching extensions: ${stats.totalFilesProcessed}`);
  console.log(`  • File content included: ${stats.includedFileContents}`);
  console.log(`  • File content skipped (size limit): ${stats.skippedDueToSize}`);
  console.log(`  • Total original size of processed files: ${formatFileSize(stats.totalOriginalSizeKB)}`);

  console.log(`\n📊 File Types Distribution (Processed Files with Content Included):`);
  const sortedFileTypes = Object.entries(stats.tokensPerFileType)
    .filter(([, tokens]) => tokens > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  sortedFileTypes.forEach(([ext, tokens]) => {
    const count = stats.filesByType[ext] || 0;
    console.log(`  • ${ext || '(no ext)'}: ~${formatNumber(tokens)} tokens (${count} files processed)`);
  });
  if (Object.keys(stats.tokensPerFileType).length > sortedFileTypes.length) {
      console.log(`  • ... and more`);
  }

  console.log("=".repeat(60));
  console.log(`✨ Done! Copy the contents of ${config.outputFile} into your AI chat.`);
  console.log("Be mindful of the total token count when providing this to an AI assistant.");
  console.log("For very large projects, consider further refining includes/excludes or splitting context.");
  console.log("=".repeat(60) + "\n");
}

// Execute the main function
generateContextFile();
