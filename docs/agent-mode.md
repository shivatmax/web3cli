# Agent Mode for Smart Contract Generation

The `--agent` flag activates a hierarchical multi-agent system powered by the Mastra AI framework that collaborates to generate secure, well-structured Solidity smart contracts.

## Overview

Agent mode uses a coordinated team of specialized AI agents, each with specific roles in the contract generation process:

1. **Coordinator Agent** - Orchestrates the overall workflow and delegates tasks
2. **Code Writer Agent** - Translates natural language requirements into Solidity code
3. **Security Audit Agent** - Checks for vulnerabilities and security issues
4. **Linting Agent** - Improves code style and adherence to best practices
5. **Functionality Checker Agent** - Verifies the contract meets requirements 
6. **Web Search Agent** - Performs web searches for relevant information
7. **Vector Store Agent** - Retrieves information from the security patterns database

## Usage

```bash
web3cli generate "Create an ERC-20 token with minting restricted to addresses in an allowlist" --agent --output Token.sol
```

## Workflow

When you run the command with `--agent`, you'll see logs showing each agent's activity:

```
🚀 Initializing Agent Mode for smart contract generation...
🤖 Coordinator Agent starting workflow for contract generation...
🔎 Agent WebSearchAgent working: Searching the web for information...
📚 Agent VectorStoreAgent working: Searching vector store...
💻 Agent CodeWriter working: Writing initial contract code...
🔒 Agent SecurityAuditor working: Auditing contract security...
🧹 Agent LintingAgent working: Checking code style and quality...
🧪 Agent FunctionalityChecker working: Verifying contract functionality...

✅ Contract saved to Token.sol
✅ Agent Mode process completed successfully!
```

## Benefits

- **Comprehensive Security** - Multiple specialized agents review the code for vulnerabilities
- **Quality Assurance** - Code style and best practices are enforced
- **Functionality Verification** - Ensures the contract meets the original requirements
- **Enhanced Knowledge** - Leverages web search and vector database for up-to-date information

## Technical Implementation

Agent mode uses the Mastra framework to implement a hierarchical multi-agent system where:

1. The Coordinator agent receives user requirements and orchestrates the entire process
2. Specialized agents are called through tool functions to perform their designated tasks
3. Information flows between agents, with each agent improving on the previous agent's work
4. The final result combines security improvements, style refinements, and functionality fixes

This approach mirrors professional smart contract development where multiple experts with different specializations collaborate on a contract's development and review. 