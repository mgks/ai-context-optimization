# Role-Based AI Development Workflow

A cost-effective method to leverage AI assistance for software development while minimizing token usage and maximizing productivity.

## Overview

This workflow creates a structured approach to working with AI assistants in any IDE or agent by:

1. Using expensive high-capacity models (Pro/MAX) for architectural work only
2. Delegating implementation tasks to more cost-effective models
3. Maintaining shared context through simple file-based communication

## Setup Files

Create these files in your project root:

```
plan.md            # Architecture and task planning
context.json       # (Optional) Shared memory and project context
interaction_log.md # (Optional) Decision notes and design choices
```

## File Templates

### `plan.md`

```markdown
# Project Plan

## Project
[Project name and description]

## Requirements
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

## Architecture
[High-level architecture notes]

## Tasks

#worker:task
name: [Task name]
priority: [high/medium/low]
files: [file1.ext, file2.ext]
context: |
  - [Task detail 1]
  - [Task detail 2]
  - [Task detail 3]

#worker:task
name: [Task name]
priority: [high/medium/low]
files: [file1.ext, file2.ext]
context: |
  - [Task detail 1]
  - [Task detail 2]
  - [Task detail 3]

## Completed Tasks

#architect:review
task: [Task name]
status: complete
files_changed: [file1.ext, file2.ext]
notes: |
  [Notes about implementation]
```

### `context.json` (Optional)

```json
{
  "project": "[Project name]",
  "entities": ["[Entity1]", "[Entity2]", "[Entity3]"],
  "dataStructures": {
    "[Structure1]": "[Description]",
    "[Structure2]": "[Description]"
  },
  "constraints": ["[Constraint1]", "[Constraint2]"],
  "dependencies": ["[Dependency1]", "[Dependency2]"]
}
```

## Workflow Process

### Step 1: Architect Role (Using Advanced Models)

1. Open `plan.md`
2. Select an advanced model:
   - Claude 3.5 or 3.7 (Sonnet/Opus)
   - GPT-4 or GPT-4o
   - Anthropic Claude
   - Gemini Pro or Ultra
   - Any other high-capability model
3. Provide this prompt:

```
You are the Project Architect.

## Project
[Project name and brief description]

## Requirements
[List key requirements]

## Instructions
Break the project down into `#worker:task` blocks using this format:

#worker:task
name: [Descriptive name]
priority: [high/medium/low]
files: [List files to create or modify]
context: |
  [Detailed instructions for the worker]
```

4. Save the output to `plan.md`

### Step 2: Worker Role (Using Cost-Effective Models)

1. Switch to a more cost-effective model:
   - GPT-3.5
   - Claude Instant
   - Llama-based models
   - Gemini or Mistral
   - Local IDE assistants (GitHub Copilot, etc.)
2. In any file or chat, paste:

```
Evaluate plan.md and implement worker:task "[Task name]".
It may create or modify multiple files as specified in the task:
[List relevant files]
```

3. Test the implementation

### Step 3: Mark Task as Complete

1. Return to `plan.md`
2. Add a `#architect:review` block:

```
#architect:review
task: [Task name]
status: complete
files_changed: [List of files changed]
notes: |
  [Notes about implementation]
```

3. Move to the next task

## Compatibility

This workflow can be used with:

- Cursor
- Visual Studio Code (with AI extensions)
- JetBrains IDEs (with AI assistants)
- GitHub Copilot
- Anthropic Claude
- ChatGPT
- Perplexity
- Any combination of AI tools that allows model switching

## Git Integration Strategy

- Create a branch for each task
- Commit changes after each task
- Include the task name in commit messages
- Use PR descriptions to summarize architectural decisions

## Cost Optimization Techniques

1. **Use the right model for the job**:
   - Architect: Advanced models for planning and architecture
   - Worker: Cost-effective models for straightforward implementation

2. **Batch instructions**:
   - Group related tasks in architect sessions
   - Provide complete context in a single prompt

3. **Minimize token usage**:
   - Reference files by name rather than pasting content
   - Use the `plan.md` file for shared context

4. **Task-oriented approach**:
   - Break down projects into discrete tasks
   - Document design decisions for future reference

## Additional Tips

- Keep `plan.md` organized by moving completed tasks to a designated section
- Use consistent task naming for easy referencing
- Update `context.json` with new entities or constraints as they emerge
- Consider using context optimization tools for large projects
- When switching between tools/platforms, maintain the same file structure
- This approach works with both commercial and open-source models 