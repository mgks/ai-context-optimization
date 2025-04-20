#!/usr/bin/env node

/**
 * AI Context Optimization : Comrehensive Context Creation Tool
 * ------------------------------
 * A tool for generating comprehensive code context for AI assistants while minimizing token costs.
 * 
 * This script creates a single markdown file containing your entire codebase structure and content,
 * which can be pasted directly into AI chat interfaces (like Cursor's MAX models) to provide
 * complete project context in one go, eliminating the need for multiple tool calls.
 * 
 * BENEFITS:
 * - Save money: Reduces cost by up to 95% when using MAX models (avoiding per file read)
 * - Better context: Provides the AI with a complete view of your project at once
 * - Privacy control: Only includes files you want, respecting .gitignore and custom exclusions
 * - Performance stats: Shows token counts, model compatibility, and cost estimations
 * 
 * USAGE:
 * 1. Configure the excludePaths and includeExtensions in the config object below
 * 2. Run: node createContext.js
 * 3. Copy the generated context.md into your AI chat
 * 4. Use a custom mode with just grep and edit tools enabled
 * 
 * Created by: Ghazi Khan (mgks.dev)
 * Version: 0.1.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define the output file name outside the config object so we can reference it
const outputFileName = 'context.md';

// CONFIGURATION - Edit these variables as needed
const config = {
  // Output file name
  outputFile: outputFileName,
  
  // Directories and files to include (empty array means include everything)
  includePaths: [],
  
  // Directories and files to exclude
  excludePaths: [
    'createContext.js',
    outputFileName,
    '.DS_Store',
    'node_modules',
    '.git',
    '.gitignore',
    '.cursorignore',
    '.cursorindexingignore',
    'dist',
    'build',
    'vendor'
  ],
  
  // File extensions to include in content (empty array means include all files)
  includeExtensions: [
    '.js', '.jsx', '.ts', '.tsx', '.php', '.html', '.css', '.scss', 
    '.json', '.md', '.txt', '.yml', '.yaml', '.config', '.env'
  ],
  
  // Maximum file size to include in content (in KB, to prevent massive files)
  maxFileSizeKB: 500
};

// Helper function to check if a path should be excluded
function shouldExclude(filePath) {
  return config.excludePaths.some(excludePath => 
    filePath.includes('/' + excludePath + '/') || filePath === excludePath || filePath.startsWith(excludePath + '/')
  );
}

// Helper function to check if a path should be included based on includePaths
function shouldInclude(filePath) {
  // If includePaths is empty, include everything (that isn't excluded)
  if (config.includePaths.length === 0) return true;
  
  return config.includePaths.some(includePath => 
    filePath.includes('/' + includePath + '/') || filePath === includePath || filePath.startsWith(includePath + '/')
  );
}

// Helper function to check if file should have its content included based on extension
function shouldIncludeContent(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  // If includeExtensions is empty, include all files
  if (config.includeExtensions.length === 0) return true;
  return config.includeExtensions.includes(ext);
}

// Helper function to get file size in KB
function getFileSizeInKB(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size / 1024;
  } catch (error) {
    return 0;
  }
}

// Helper function to estimate token count based on text length
// Most models count about 4 characters per token on average
function estimateTokenCount(text, fileExt = '') {
  // Average tokens per character for different languages
  const TOKENS_PER_CHAR = {
    '.js': 0.25,    // JavaScript: ~4 chars per token
    '.jsx': 0.25,   // JSX: ~4 chars per token
    '.ts': 0.25,    // TypeScript: ~4 chars per token
    '.tsx': 0.25,   // TSX: ~4 chars per token
    '.php': 0.25,   // PHP: ~4 chars per token
    '.html': 0.25,  // HTML: ~4 chars per token
    '.css': 0.22,   // CSS: ~4.5 chars per token
    '.scss': 0.22,  // SCSS: ~4.5 chars per token
    '.json': 0.3,   // JSON: ~3.3 chars per token (lots of quotes and symbols)
    '.md': 0.18,    // Markdown: ~5.5 chars per token (lots of natural language)
    '.txt': 0.18,   // Text: ~5.5 chars per token (natural language)
    '.yml': 0.25,   // YAML: ~4 chars per token
    '.yaml': 0.25,  // YAML: ~4 chars per token
    'default': 0.25 // Default: ~4 chars per token
  };
  
  // Get token multiplier based on file extension (if available)
  let tokensPerChar = TOKENS_PER_CHAR.default;
  if (fileExt && TOKENS_PER_CHAR[fileExt]) {
    tokensPerChar = TOKENS_PER_CHAR[fileExt];
  }
  
  // Return estimated token count
  return Math.ceil(text.length * tokensPerChar);
}

// Helper function to determine language from file extension for markdown code blocks
function getLanguageFromExt(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const langMap = {
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.php': 'php',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.json': 'json',
    '.md': 'markdown',
    '.txt': 'text',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.sh': 'bash',
    '.bash': 'bash',
    '.py': 'python',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.dart': 'dart',
    '.sql': 'sql'
  };
  
  return langMap[ext] || 'plaintext';
}

// Generate the directory tree using find command for more reliable results
function generateDirectoryTree() {
  try {
    // Create the find command with exclusions
    const excludeArgs = config.excludePaths.map(dir => `-not -path "./${dir}/*" -not -path "./${dir}"`).join(' ');
    const includeArgs = config.includePaths.length > 0 
      ? config.includePaths.map(dir => `-path "./${dir}*"`).join(' -o ') 
      : '';
    
    const findCommand = includeArgs
      ? `find . -type f ${excludeArgs} \\( ${includeArgs} \\) | sort`
      : `find . -type f ${excludeArgs} | sort`;
    
    // Execute the command
    const output = execSync(findCommand, { encoding: 'utf8' });
    return output.split('\n').filter(line => line.trim() !== '');
  } catch (error) {
    console.error('Error generating directory tree:', error);
    return [];
  }
}

// Generate a visual tree structure from file paths
function generateTreeStructure(files) {
  // First, clean up the file paths (remove ./ prefix)
  const cleanPaths = files.map(file => file.startsWith('./') ? file.substring(2) : file);
  
  // Create a tree object
  const tree = {};
  
  // Build the tree structure
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
  
  // Function to print the tree structure
  function printTree(node, prefix = '', isLast = true, path = '') {
    let result = '';
    
    // Print directories
    if (node.dirs) {
      const dirs = Object.keys(node.dirs);
      dirs.forEach((dir, index) => {
        const isLastDir = index === dirs.length - 1 && (!node.files || node.files.length === 0);
        const newPath = path ? `${path}/${dir}` : dir;
        
        result += `${prefix}${isLast && isLastDir ? '└── ' : '├── '}📁 ${dir}/\n`;
        result += printTree(node.dirs[dir], 
                          `${prefix}${isLast && isLastDir ? '    ' : '│   '}`, 
                          isLastDir, 
                          newPath);
      });
    }
    
    // Print files
    if (node.files) {
      node.files.sort(); // Sort files alphabetically
      node.files.forEach((file, index) => {
        const isLastFile = index === node.files.length - 1;
        result += `${prefix}${isLastFile ? '└── ' : '├── '}${file}\n`;
      });
    }
    
    return result;
  }
  
  // Generate and return the tree structure
  return printTree(tree);
}

// Clean file path (remove ./ prefix)
function cleanPath(filePath) {
  return filePath.startsWith('./') ? filePath.substring(2) : filePath;
}

// Format a file size for display
function formatFileSize(sizeInKB) {
  if (sizeInKB < 1024) {
    return `${sizeInKB.toFixed(2)} KB`;
  } else {
    return `${(sizeInKB / 1024).toFixed(2)} MB`;
  }
}

// Format number with commas for readability
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Generate the context.md file
function generateContextFile() {
  const allFiles = generateDirectoryTree();
  const stats = {
    totalFiles: allFiles.length,
    includedFiles: 0,
    skippedFiles: 0,
    skippedDueToSize: 0,
    skippedDueToType: 0,
    totalTokens: 0,
    totalCharacters: 0,
    totalSizeKB: 0,
    filesByType: {},
    tokensPerFileType: {}
  };
  
  // Start building the content
  let content = `# Project Context\n\n`;
  
  // Add directory tree section with visual structure
  content += `## Directory Structure\n\n\`\`\`\n`;
  content += generateTreeStructure(allFiles);
  content += `\`\`\`\n\n`;
  
  // Add file contents section
  content += `## File Contents\n\n`;
  
  // Process all files
  for (const filePath of allFiles) {
    const cleanFilePath = cleanPath(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    
    // Track file types
    if (!stats.filesByType[fileExt]) {
      stats.filesByType[fileExt] = 0;
      stats.tokensPerFileType[fileExt] = 0;
    }
    stats.filesByType[fileExt]++;
    
    // Skip files that should be excluded from content
    if (!shouldIncludeContent(filePath)) {
      stats.skippedFiles++;
      stats.skippedDueToType++;
      content += `### ${cleanFilePath}\n\n*File content skipped due to file type configuration*\n\n`;
      continue;
    }
    
    // Skip files that are too large
    const fileSizeKB = getFileSizeInKB(filePath);
    stats.totalSizeKB += fileSizeKB;
    
    if (fileSizeKB > config.maxFileSizeKB) {
      stats.skippedFiles++;
      stats.skippedDueToSize++;
      content += `### ${cleanFilePath}\n\n*File content skipped (${fileSizeKB.toFixed(2)} KB exceeds ${config.maxFileSizeKB} KB limit)*\n\n`;
      continue;
    }
    
    try {
      // Read the file content
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const language = getLanguageFromExt(filePath);
      
      // Update statistics
      stats.includedFiles++;
      const fileTokens = estimateTokenCount(fileContent, fileExt);
      stats.totalTokens += fileTokens;
      stats.totalCharacters += fileContent.length;
      stats.tokensPerFileType[fileExt] += fileTokens;
      
      // Add file section with start/end markers
      content += `### ${cleanFilePath}\n\n`;
      content += `----- ${cleanFilePath} file starts -----\n\n`;
      content += `\`\`\`${language}\n${fileContent}\n\`\`\`\n\n`;
      content += `----- ${cleanFilePath} file ends -----\n\n`;
    } catch (error) {
      stats.skippedFiles++;
      content += `### ${cleanFilePath}\n\n*Error reading file: ${error.message}*\n\n`;
    }
  }
  
  // Calculate tokens for the structure and headers
  const structureTokens = estimateTokenCount(content, '.md');
  stats.totalTokens += structureTokens;
  
  // Write the content to the output file
  fs.writeFileSync(config.outputFile, content);
  
  // Calculate final stats
  const outputFileSizeKB = getFileSizeInKB(config.outputFile);
  
  // Get top 5 file types by token count
  const topFileTypes = Object.entries(stats.tokensPerFileType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // Output detailed statistics
  console.log("\n" + "=".repeat(60));
  console.log(`📊 CONTEXT FILE STATISTICS`);
  console.log("=".repeat(60));
  console.log(`📝 Content Summary:`);
  console.log(`  • Context file created: ${config.outputFile}`);
  console.log(`  • File size: ${formatFileSize(outputFileSizeKB)}`);
  console.log(`  • Estimated tokens: ${formatNumber(stats.totalTokens)}`);
  console.log(`  • Characters: ${formatNumber(stats.totalCharacters)}`);
  console.log(`  • Markdown overhead: ~${formatNumber(structureTokens)} tokens`);
  
  console.log(`\n📁 File Processing:`);
  console.log(`  • Total files found: ${stats.totalFiles}`);
  console.log(`  • Files included: ${stats.includedFiles}`);
  console.log(`  • Files skipped: ${stats.skippedFiles}`);
  if (stats.skippedDueToSize > 0) {
    console.log(`    - Skipped (size): ${stats.skippedDueToSize}`);
  }
  if (stats.skippedDueToType > 0) {
    console.log(`    - Skipped (type): ${stats.skippedDueToType}`);
  }
  console.log(`  • Total original size: ${formatFileSize(stats.totalSizeKB)}`);
  
  console.log(`\n📊 File Types Distribution:`);
  
  // Show file types sorted by count
  const sortedFileTypes = Object.entries(stats.filesByType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8); // Show top 8 file types
  
  sortedFileTypes.forEach(([ext, count]) => {
    const tokens = stats.tokensPerFileType[ext] || 0;
    console.log(`  • ${ext || '(no extension)'}: ${count} files, ~${formatNumber(tokens)} tokens`);
  });
  
  console.log(`\n📈 Token Usage by AI Model:`);
  // Show token percentage for different AI model context limits
  const models = [
    { name: "Claude Instant", limit: 100000 },
    { name: "Claude 3.5 Sonnet", limit: 120000 },
    { name: "Claude 3.7 Sonnet", limit: 120000 },
    { name: "Claude 3.7 MAX", limit: 200000 },
    { name: "Gemini 2.5 Pro", limit: 120000 },
    { name: "Gemini 2.5 Pro MAX", limit: 1000000 },
    { name: "GPT-4o", limit: 128000 }
  ];
  
  models.forEach(model => {
    const percentUsed = (stats.totalTokens / model.limit) * 100;
    const statusSymbol = percentUsed > 95 ? "❌" : percentUsed > 80 ? "⚠️" : "✅";
    console.log(`  ${statusSymbol} ${model.name}: ${percentUsed.toFixed(1)}% of ${formatNumber(model.limit)} token limit`);
  });
  
  console.log("\n💰 Cost Comparison:");
  // Calculate approximate cost for different models
  const costs = [
    { name: "Claude 3.7 Sonnet", cost: stats.totalTokens / 1000 * 0.0153 },
    { name: "Claude 3.7 MAX", cost: 0.05 + 0.05 * stats.includedFiles }, // 0.05 per prompt + 0.05 per tool call
    { name: "Gemini 2.5 Pro", cost: stats.totalTokens / 1000 * 0.014 },
    { name: "Gemini 2.5 Pro MAX", cost: 0.05 + 0.05 * stats.includedFiles },
    { name: "GPT-4o", cost: stats.totalTokens / 1000 * 0.015 }
  ];
  
  costs.forEach(model => {
    console.log(`  • ${model.name}: $${model.cost.toFixed(4)}`);
  });
  
  // Show potential savings
  const regularCost = 0.05 * stats.includedFiles; // 0.05 per file read
  const savingsAmount = regularCost - 0.05; // Single prompt vs multiple file reads
  const savingsPercent = (savingsAmount / regularCost) * 100;
  
  console.log(`\n💸 Tool Call Savings:`);
  console.log(`  • Without this script: $${regularCost.toFixed(2)} (${stats.includedFiles} file reads @ $0.05)`);
  console.log(`  • With this script: $0.05 (single prompt)`);
  console.log(`  • Savings: $${savingsAmount.toFixed(2)} (${savingsPercent.toFixed(0)}%)`);
  
  console.log("=".repeat(60));
  console.log(`✨ Done! Copy the contents of ${config.outputFile} into your Cursor chat.`);
  console.log("=".repeat(60) + "\n");
}

// Execute the main function
generateContextFile();
