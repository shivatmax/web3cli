# Web3CLI: AI-Powered Smart Contract Generator

Generate secure Solidity smart contracts from natural language using AI.

## Features

- **Natural Language to Solidity**: Translate requirements into secure, minimal code
- **Security First**: Built-in guardrails and security best practices
- **Documentation**: Automatic security considerations and explanations
- **Agent Mode**: Hierarchical multi-agent system for enhanced security and quality

### Installation

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

## Usage

Generate a smart contract from natural language:

```bash
web3cli generate "Create an ERC-20 token with minting restricted to addresses in an allowlist" --output Token.sol
```

### Agent Mode

Use the advanced multi-agent system for enhanced security and code quality:

```bash
web3cli generate "Create an ERC-20 token with minting restricted to addresses in an allowlist" --agent --output Token.sol
```

Agent mode activates a team of specialized AI agents that collaborate in sequence:

1. **Coordinator Agent**: Orchestrates the entire workflow
2. **Web Search Agent**: Gathers relevant information if needed
3. **Vector Store Agent**: Retrieves security patterns and best practices
4. **Code Writer Agent**: Generates the initial Solidity implementation
5. **Security Audit Agent**: Analyzes the code for vulnerabilities
6. **Linting Agent**: Improves code style and readability
7. **Functionality Checker**: Verifies behavior and generates tests if requested

## Options

- `--model <model>`: Specify the model to use (default: gpt-4o-mini)
- `--output <file>`: Output file for the generated contract
- `--hardhat`: Generate Hardhat test file
- `--agent`: Use hierarchical multi-agent mode
- `--files <files...>`: Additional context files
- `--url <urls...>`: URLs to fetch as context
- `--search`: Enable web search for context
- `--read-docs <collection>`: Read from vector DB docs collection

## Design Considerations

- **Security-First Approach**: All generated contracts emphasize security best practices with clear explanations
- **Modern Standards**: Uses the latest Solidity version and patterns by default
- **Documentation Integration**: Vector search provides context from up-to-date documentation
- **AI Integration**: Uses advanced AI models for high-quality contract generation and analysis

## Project Structure

```
web3cli/
├── docs/                # Documentation
│   ├── agent-mode.md    # Multi-agent system documentation
│   ├── problem-solution.md # Problem statement and architecture
│   ├── project-documentation.md # Full project documentation
│   └── vector-db.md     # Vector database documentation
├── src/                 # Source code
│   ├── agents/          # Agent system components
│   │   ├── coordinator.ts     # Agent orchestration
│   │   ├── code-writer.ts     # Code generation
│   │   ├── security-audit.ts  # Security auditing
│   │   ├── linting.ts         # Code quality
│   │   ├── functionality.ts   # Verify behavior
│   │   ├── web-search.ts      # Web search
│   │   └── vector-store.ts    # Documentation retrieval
│   ├── cli/             # CLI interface components
│   │   ├── commands/         # Command implementations
│   │   └── index.ts          # CLI entry point
│   ├── services/        # Core services
│   │   ├── ai/              # AI model integration
│   │   ├── contract/        # Contract generation
│   │   ├── search/          # Search services
│   │   ├── vector-db/       # Vector database
│   │   └── config/          # Configuration
│   └── utils/           # Shared utilities
└── templates/           # Reusable contract templates
```

# Vector Database

Web3CLI includes a local vector database for storing and searching documentation using semantic similarity.

## Vector Database Features

- Store and retrieve documents using vector embeddings
- Add content from URLs with automatic text extraction
- Recursively crawl websites to build knowledge bases
- Add local files or text directly to collections
- Perform semantic search across your document collections
- Integrate search results with AI queries using RAG (Retrieval Augmented Generation)

## Vector Database Commands

```bash
# List all collections in the vector database
web3cli vdb-list

# Add documents from a URL to the vector database
web3cli vdb-add-docs <url> --name <collection-name> --crawl --max-pages 30

# Add a file to the vector database
web3cli vdb-add-file <file-path> --name <collection-name> --title "Document Title"

# Add text directly to the vector database
web3cli vdb-add-text "Smart contract security involves..." --name security-patterns --title "Security Best Practices"

# Search the vector database
web3cli vdb-search "your query here" --name <collection-name> -k 5
```

## Example Workflow

```bash
# Add Solidity documentation to a collection
web3cli vdb-add-docs https://docs.soliditylang.org/ --name solidity --crawl

# Search the collection
web3cli vdb-search "how to handle errors in solidity" --name solidity

# Use vector search with generation
web3cli generate "Create an NFT with royalties" --read-docs solidity
```

## Setup Quick Documentation

Run the setup command to quickly index documentation for common Web3 technologies:

```bash
web3cli setup --max-pages 50
```

This will create collections for Solidity, Ethers.js, Hardhat, and OpenZeppelin.

## Core Technologies

Web3CLI is built with the following key technologies:

- **OpenAI API/Claude API**: Powers the AI capabilities
- **LangChain**: Framework for multi-agent operations
- **OpenAI Embeddings**: For vector representation
- **ethers.js**: Ethereum interaction library
- **Solidity Compiler**: For validating contracts
- **CAC**: Lightweight CLI framework

## License

MIT
