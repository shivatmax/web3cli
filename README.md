# Web3CLI: AI-Powered Smart Contract Tool

A comprehensive suite for generating secure Solidity smart contracts and analyzing existing contracts using AI.

## Overview

Web3CLI is a powerful developer tool that leverages AI to solve two key problems in blockchain development:

1. **Natural Language to Smart Contract Logic** - Translates requirements into secure, minimal Solidity code
2. **Smart Contract Explainability** - Provides plain-English summaries of complex smart contracts

The tool uses advanced AI models with specialized guardrails to ensure secure code generation, supported by a multi-agent system, web search, and vector database integration for enhanced security and quality.

## Installation

### NPM Package (Recommended)

The easiest way to install Web3CLI is via npm:

```bash
npm install -g @web3ai/cli
```

Or with pnpm:

```bash
pnpm add -g @web3ai/cli
```

After installation, you can verify it worked by running:

```bash
web3cli --version
```

The package is published to the npm registry as [@web3ai/cli](https://www.npmjs.com/package/@web3ai/cli).

### Manual Installation (From Source)

If you prefer to install from source:

```bash
git clone https://github.com/shivatmax/web3cli.git
```
```bash
cd web3cli
```
```bash
pnpm install
```
```bash
pnpm build
```
```bash
npm link
```

## Configuration

Create a `web3cli.toml` file in your project directory:

```toml
#:schema ./schema.json
default_model = "gpt-4o-mini" # or another model

# OpenAI Configuration
openai_api_key = "your-openai-api-key"

# Gemini Configuration - for Google Gemini models
# gemini_api_key = "your-gemini-api-key"

# Anthropic Configuration - for Claude models
# anthropic_api_key = "your-anthropic-api-key"

# Groq Configuration - for faster inference
# groq_api_key = "your-groq-api-key"

# Mistral Configuration
# mistral_api_key = "your-mistral-api-key"

# Ollama Configuration - for local models
# ollama_host = "http://localhost:11434"

# Etherscan API key (optional, for contract analysis)
etherscan_api_key = "your-etherscan-api-key"
```

Or set environment variables:
- `OPENAI_API_KEY` - For OpenAI models
- `GEMINI_API_KEY` - For Google Gemini models
- `ANTHROPIC_API_KEY` - For Claude models
- `GROQ_API_KEY` - For Groq inference
- `MISTRAL_API_KEY` - For Mistral models
- `ETHERSCAN_API_KEY` - For contract analysis (optional)

## Key Features

- **Multi-Provider AI Support** - Works with OpenAI, Anthropic/Claude, Google Gemini, Groq, Mistral, GitHub Copilot, and Ollama
- **Natural Language to Solidity Code** - Generate smart contracts from plain English
- **Security-First Approach** - Built-in guardrails to prevent insecure patterns
- **Contract Explainability** - Analyze contracts for permissions and security patterns
- **Multi-Agent System** - Specialized agents collaborate to enhance quality
- **Vector Database** - Local storage of blockchain documentation and security patterns
- **Web Search** - Up-to-date information for secure implementations
- **CLI and Terminal Interface** - Developer-friendly command-line tools
- **Robust File System Handling** - Automatically creates necessary directories for output

## Supported AI Models

Web3CLI supports a wide range of AI models across multiple providers:

### OpenAI
- GPT-4o, GPT-4o-mini, GPT-4.1, GPT-3.5-turbo
- OpenAI "o" series: o1, o1-mini, o3, o4-mini, etc.

### Anthropic
- Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus

### Google Gemini
- Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 2.0, Gemini 1.5

### Groq
- Llama 3.3 70B, Llama 3.1 8B, Mixtral 8x7B

### Mistral
- Mistral Large, Mistral Medium, Mistral Small

### GitHub Copilot
- Copilot models with GPT-4o, o1, Claude 3.5 backend options

### Ollama
- Local models via Ollama server

## Usage Examples

### General Web3 Development Questions

```bash
# Ask a general Web3 development question
web3cli "What is the difference between ERC-20 and ERC-721?"

# Ask with web search enabled
web3cli "What is the current gas cost for token transfers?" --search

# Ask with specific model
web3cli "Explain the EIP-2981 royalty standard" --model gpt-4o

# Ask with alternative providers
web3cli "Explain the EIP-2981 royalty standard" --model claude-3-5-sonnet
web3cli "Explain gas optimization" --model gemini-2.5-flash

# List available models
web3cli list
```

### Natural Language to Smart Contract

```bash
# Generate a secure ERC-20 token with allowlist
web3cli generate "Create an ERC-20 token with minting restricted to addresses in an allowlist" --output Token.sol --no-stream

# Generate with agent mode for enhanced security
web3cli generate "Create an ERC-20 token with minting restricted to addresses in an allowlist" --agent --output Token.sol --no-stream

# Generate with Hardhat tests
web3cli generate "Create an NFT collection with royalties" --hardhat --output NFTCollection.sol --no-stream

# Generate with web search for security best practices
web3cli generate "Create a vesting contract" --search --no-stream

# Generate with vector DB context
web3cli generate "Create an NFT with royalties" --read-docs solidity
```

### Smart Contract Explainability

```bash
# Analyze a contract by address (Mainnet)
web3cli contract 0xdac17f958d2ee523a2206206994597c13d831ec7 --network mainnet -o

# Analyze a Solidity file
web3cli contract --file MyContract.sol --no-stream

# Explain a Solidity file 
web3cli contract:explain --file MyContract.sol --no-stream

# Audit a contract
web3cli contract:audit 0xdac17f958d2ee523a2206206994597c13d831ec7 --network mainnet -o

# Ask custom questions about a contract
web3cli contract:custom 0xdac17f958d2ee523a2206206994597c13d831ec7 "What security patterns does this contract implement?" --network mainnet
```

## Agent Mode

When using the agent mode with `--agent` flag, the system follows this workflow:

1. The **Coordinator Agent** receives the natural language request and plans the execution
2. The **Web Search Agent** gathers relevant information about the requested contract if needed
3. The **Vector Store Agent** retrieves security patterns and best practices from the vector database
4. The **Code Writer Agent** generates the initial Solidity implementation using all gathered context
5. The **Security Audit Agent** analyzes the code for vulnerabilities and provides improvements
6. The **Linting Agent** cleans up the code style and improves readability
7. The **Functionality Checker** verifies the contract works as intended and generates tests if requested
8. The **Coordinator Agent** finalizes the output, combining all the improvements

This collaborative approach results in higher quality, more secure smart contracts than using a single AI model.

## Options

- `--model <model>`: Specify the model to use (default: gpt-4o-mini)
- `--output <file>`: Output file for the generated contract
- `--hardhat`: Generate Hardhat test file
- `--agent`: Use hierarchical multi-agent mode
- `--files <files...>`: Additional context files
- `--url <urls...>`: URLs to fetch as context
- `--search`: Enable web search for context
- `--read-docs <collection>`: Read from vector DB docs collection
- `--no-stream`: Disable streaming responses

## Vector Database

Web3CLI includes a local vector database for storing and searching documentation using semantic similarity.

### Vector Database Commands

```bash
# List all collections in the vector database
web3cli vdb-list

# Add documents from a URL to the vector database
web3cli vdb-add-docs <url> --name <collection-name> --crawl --max-pages 30

# Add a file to the vector database
web3cli vdb-add-file <file-path> --name <collection-name> --title "Document Title"

# Search the vector database
web3cli vdb-search "ERC721 royalties implementation" --name solidity -k 5

# Add documentation from predefined sources
web3cli setup --max-pages 50

# Initialize vector database (alias for backward compatibility)
web3cli vector-db

# Use vector search with generation
web3cli generate "Create an NFT with royalties" --read-docs solidity
```

### Document Structure

The vector database stores and returns documents with this structure:

```typescript
{
  pageContent: "The document text content...",
  metadata: {
    source: "https://example.com/docs/page",
    title: "Document Title",
    url: "https://example.com/docs/page",
    siteName: "Example Documentation",
    author: "Example Author",
    crawlTime: "2023-06-15T12:34:56Z"
  }
}
```

## Design Tradeoffs

### Model Choice
- Multiple AI providers supported for flexibility and performance
- **OpenAI/GPT-4o** - Superior understanding of Solidity but higher cost
- **Claude models** - Strong reasoning for complex contracts
- **Gemini models** - Good balance of capabilities and cost 
- **Groq models** - Fast inference for time-sensitive tasks
- **Mistral models** - Efficient performance for routine tasks
- **Ollama** - Local models for privacy and offline work
- Security is prioritized over cost for critical smart contract generation
- Lesser models used for non-critical tasks like search and documentation

### Security vs. Speed
- Security is prioritized with multiple agent reviews
- Vector database provides security patterns for faster reference
- Tradeoff favors security at the cost of generation time

## Project Structure

```
web3cli/
├── docs/                # Documentation
├── scripts/             # Utility scripts
├── src/                 # Source code
│   ├── agents/          # Agent system components
│   │   ├── coordinator.ts     # Agent orchestration
│   │   ├── code-writer.ts     # Code generation
│   │   ├── security-audit.ts  # Security auditing
│   │   ├── linting.ts         # Code quality
│   │   ├── functionality.ts   # Verify behavior
│   │   ├── web-search.ts      # Web search
│   │   └── vector-store.ts    # Documentation retrieval
│   ├── cli/             # CLI interface
│   │   └── commands/         # Command implementations
│   ├── services/        # Core services
│   │   ├── ai/              # AI model integration
│   │   ├── config/          # Configuration
│   │   ├── contract/        # Contract generation
│   │   ├── search/          # Search services
│   │   ├── ui/              # User interface helpers
│   │   └── vector-db/       # Vector database
│   └── utils/           # Shared utilities
```

## Core Technologies

Web3CLI is built with the following key technologies:

- **Multiple AI Providers** - OpenAI, Anthropic, Google, Groq, Mistral, GitHub Copilot, and Ollama
- **LangChain** - Framework for multi-agent operations
- **OpenAI Embeddings** - For vector representation
- **ethers.js** - Ethereum interaction library
- **Solidity Compiler** - For validating contracts
- **CAC** - Lightweight CLI framework

## Recent Updates

- **Multi-Provider AI Support** - Added support for Claude, Gemini, Groq, Mistral, GitHub Copilot, and Ollama models
- **Improved File System Handling** - Now automatically creates output directories as needed
- **Enhanced Error Handling** - Better error messages for common issues
- **Model Selection Improvements** - Simplified model selection and provider detection
- **MetaMask Error Handling Utility** - Added support for better MetaMask error handling

## Future Plans

1. **Formal Verification Integration** - Connect with formal verification tools for critical contracts
2. **Gas Optimization Analysis** - Add detailed gas estimation and optimization suggestions
3. **Custom Documentation Integration** - Allow developers to add proprietary documentation
4. **Web Interface** - Develop a web-based UI for easier adoption
5. **Expanded Chain Support** - Add support for additional EVM-compatible chains

## License

MIT
