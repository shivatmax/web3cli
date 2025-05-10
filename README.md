# Web3CLI: AI-Powered Smart Contract Tool

A comprehensive suite for generating secure Solidity smart contracts and analyzing existing contracts using AI.

## Overview

Web3CLI is a powerful developer tool that leverages AI to solve two key problems in blockchain development:

1. **Natural Language to Smart Contract Logic** - Translates requirements into secure, minimal Solidity code
2. **Smart Contract Explainability** - Provides plain-English summaries of complex smart contracts

The tool uses advanced AI models with specialized guardrails to ensure secure code generation, supported by a multi-agent system, web search, and vector database integration for enhanced security and quality.

## Installation

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
openai_api_key = "your-openai-api-key"
etherscan_api_key = "your-etherscan-api-key" # optional
```

Or set environment variables:
- `OPENAI_API_KEY`
- `ETHERSCAN_API_KEY` (optional, for fetching contract ABIs)

## Key Features

- **Natural Language to Solidity Code** - Generate smart contracts from plain English
- **Security-First Approach** - Built-in guardrails to prevent insecure patterns
- **Contract Explainability** - Analyze contracts for permissions and security patterns
- **Multi-Agent System** - Specialized agents collaborate to enhance quality
- **Vector Database** - Local storage of blockchain documentation and security patterns
- **Web Search** - Up-to-date information for secure implementations
- **CLI and Terminal Interface** - Developer-friendly command-line tools

## Usage Examples

### General Web3 Development Questions

```bash
# Ask a general Web3 development question
web3cli "What is the difference between ERC-20 and ERC-721?"

# Ask with web search enabled
web3cli "What is the current gas cost for token transfers?" --search

# Ask with specific model
web3cli "Explain the EIP-2981 royalty standard" --model gpt-4o

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
- **GPT-4o** - Superior understanding of Solidity but higher cost
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

- **OpenAI API/Claude API**: Powers the AI capabilities
- **LangChain**: Framework for multi-agent operations
- **OpenAI Embeddings**: For vector representation
- **ethers.js**: Ethereum interaction library
- **Solidity Compiler**: For validating contracts
- **CAC**: Lightweight CLI framework

## Future Plans

1. **Formal Verification Integration** - Connect with formal verification tools for critical contracts
2. **Gas Optimization Analysis** - Add detailed gas estimation and optimization suggestions
3. **Custom Documentation Integration** - Allow developers to add proprietary documentation
4. **Web Interface** - Develop a web-based UI for easier adoption
5. **Expanded Chain Support** - Add support for additional EVM-compatible chains

## License

MIT
