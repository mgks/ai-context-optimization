# AI Context Optimization Tools and Techniques

This repository contains techniques and tools for optimizing how AI coding assistants understand your codebase, with a focus on cost reduction and efficiency.

## Optimizations

### [Cursor MAX Optimizer](./cursor-max-optimizer)

Generate a comprehensive markdown file of your entire codebase to provide to AI models in a single operation, eliminating the need for multiple expensive file search, read and write tool calls. While works best for Cursor MAX models it can can also be used to optimize context with other editors, agents or LLMs directly.

**Key Benefits:**
- Save up to 97% on costs with MAX models (one prompt vs. dozens of file reads)
- Provide complete context in a format AI can easily understand
- Includes token usage statistics and model compatibility checks

```bash
# Try it out:
cd cursor-max-optimizer
node createContext.js
```

### [Role-Based AI Development Workflow](./role-based-workflow)

A structured approach to AI-assisted development that separates architectural planning from implementation, using different AI models for each role to optimize costs.

**Key Benefits:**
- Use advanced models only for high-level architecture
- Delegate implementation to cost-effective models
- Maintain shared context through simple file-based communication
- Works with any AI-powered IDE or assistant

```bash
# Get started by creating:
touch plan.md context.json interaction_log.md
```

## Let's Discuss

- Context pruning techniques
- Focused context generators
- Language-specific optimizers

**[Join Discussions on GitHub](https://github.com/mgks/ai-context-optimization/discussions)**

---

:rocket: Created by [Ghazi Khan](https://mgks.dev)