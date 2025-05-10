# Web3CLI: AI-Powered Smart Contract Generator

Generate secure Solidity smart contracts from natural language using AI.

## Features

- **Natural Language to Solidity**: Translate requirements into secure, minimal code
- **Security First**: Built-in guardrails and security best practices
- **Documentation**: Automatic security considerations and explanations
- **Agent Mode**: Hierarchical multi-agent system for enhanced security and quality (NEW!)

## Installation

```bash
npm install -g web3cli
```

## Configuration

Create a `~/.config/web3cli/config.json` file:

```json
{
  "openai_api_key": "your-api-key-here",
  "etherscan_api_key": "your-etherscan-key-here"
}
```

Or set environment variables:
- `OPENAI_API_KEY`
- `ETHERSCAN_API_KEY` (optional, for fetching contract ABIs)

## Usage

Generate a smart contract from natural language:

```bash
web3cli generate "Create an ERC-20 token with minting restricted to addresses in an allowlist" --output Token.sol
```

### Agent Mode (New)

Use the advanced multi-agent system for enhanced security and code quality:

```bash
web3cli generate "Create an ERC-20 token with minting restricted to addresses in an allowlist" --agent --output Token.sol
```

Agent mode activates a team of specialized AI agents that collaborate to produce high-quality smart contracts:

- Code Writer Agent: Translates requirements into Solidity
- Security Audit Agent: Checks for vulnerabilities 
- Linting Agent: Ensures code quality and style
- Functionality Checker: Verifies contract behavior
- Web Search Agent: Gathers relevant information
- Vector Store Agent: Retrieves security patterns

See [Agent Mode Documentation](docs/agent-mode.md) for more details.

## Options

- `--model <model>`: Specify the model to use (default: gpt-4o)
- `--output <file>`: Output file for the generated contract
- `--hardhat`: Generate Hardhat test file
- `--agent`: Use hierarchical multi-agent mode (experimental)
- `--files <files...>`: Additional context files
- `--url <urls...>`: URLs to fetch as context
- `--search`: Enable web search for context
- `--read-docs <collection>`: Read from vector DB docs collection

## Design Considerations

- **Security-First Approach**: All generated contracts emphasize security best practices with clear explanations
- **Modern Standards**: Uses the latest Solidity version and patterns by default
- **Documentation Integration**: Vector search provides context from up-to-date documentation
- **OpenAI Integration**: Uses GPT-4o for high-quality contract generation and analysis

## License

MIT

## Project Structure

```
web3cli/
├── .vscode/             # VS Code configuration
├── dist/                # Compiled JavaScript files
├── docs/                # Documentation
│   ├── agent-mode.md    # Multi-agent system documentation
│   ├── api/             # API documentation
│   └── examples/        # Example contracts and usage
├── scripts/             # Development and build scripts
├── src/                 # Source code
│   ├── agents/          # Agent system components
│   │   ├── code-writer.ts     # Code generation agent
│   │   ├── security-audit.ts  # Security auditing agent
│   │   ├── linting.ts         # Code linting agent
│   │   ├── functionality.ts   # Functionality verification agent
│   │   ├── coordinator.ts     # Agent coordinator
│   │   ├── web-search.ts      # Web search agent
│   │   └── vector-store.ts    # Documentation retrieval agent
│   ├── cli/             # CLI interface components
│   │   ├── commands/         # Command implementations
│   │   ├── options.ts        # CLI options handling
│   │   ├── ui.ts             # Terminal UI utilities
│   │   └── index.ts          # CLI entry point
│   ├── services/        # Core services
│   │   ├── ai/              # AI model integration
│   │   ├── contract/        # Contract generation & analysis
│   │   ├── search/          # Search services
│   │   ├── vector-db/       # Vector database operations
│   │   └── config/          # Configuration management
│   ├── utils/           # Shared utilities
│   └── types/           # TypeScript type definitions
├── templates/           # Reusable code templates
│   ├── contracts/       # Smart contract templates
│   └── tests/           # Test templates
├── tests/               # Test suite
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── fixtures/        # Test fixtures
└── web/                 # Web interface (future enhancement)
```

This structure organizes the codebase for maintainability and future growth, with clear separation of concerns and logical grouping of related functionality.

# Vector Database for Web3CLI

We've added a local vector database to the web3cli tool that allows you to store and search documents using semantic similarity with OpenAI embeddings. This implementation provides the following features:

## Features

- Store and retrieve documents using vector embeddings
- Add content from URLs with automatic text extraction
- Recursively crawl websites to build knowledge bases
- Add local files to collections
- Perform semantic search across your document collections
- Integrate search results with AI queries using RAG (Retrieval Augmented Generation)

## Commands

### Add Documents from URL

```bash
web3cli vector-db add-docs https://docs.example.com --name my-collection --crawl --max-pages 30
```

This command fetches the content from the URL, extracts meaningful text content, splits it into chunks, and stores it in the vector database.

### Add File

```bash
web3cli vector-db add-file ./my-document.md --name my-collection
```

Add local files to your vector database for later retrieval.

### Search

```bash
web3cli vector-db search "how does staking work" --name solidity
```

Perform a semantic search across your stored documents to find the most relevant content.

### List Collections

```bash
web3cli vector-db list
```

Display all available collections in your vector database.

## Setup Documentation

To quickly set up a collection of Web3 documentation:

```bash
web3cli setup --max-pages 50
```

This will add documentation for Solidity, Ethers.js, Hardhat, and OpenZeppelin.

## Using Vector Search in Queries

When asking questions with web3cli, you can use the `--read-docs` flag to incorporate relevant information from your vector database:

```bash
web3cli "How do I implement an ERC-721 token?" --read-docs solidity
```

This retrieves relevant information about ERC-721 from your Solidity documentation collection and includes it in the context for the AI model.

## Implementation Details

The vector database is implemented using:
- **OpenAI Embeddings**: To convert text into vector representations
- **LangChain's MemoryVectorStore**: For local in-memory storage with persistence to disk
- **Cheerio**: To parse and extract text content from HTML documents
- **RecursiveCharacterTextSplitter**: To chunk documents into manageable pieces

For more details, see the [Vector Database Documentation](docs/vector-db.md).

# Vector Database Usage

The Web3CLI includes a vector database for storing, indexing, and searching documents. This is useful for:

- Storing documentation for quick reference
- Creating knowledge bases for AI queries
- Building semantic search for your project's documents

### Vector Database Commands

```bash
# List all collections in the vector database
web3cli vdb-list

# Add documents from a URL to the vector database
web3cli vdb-add-docs <url> --name <collection-name> --crawl --max-pages 50

# Note: There is a maximum limit of 30 pages when crawling websites for safety and performance reasons

# Add a file to the vector database
web3cli vdb-add-file <file-path> --name <collection-name> --title "Document Title"

# Search the vector database
web3cli vdb-search "your query here" --name <collection-name> -k 5
```

### Examples

```bash
# Add Solidity documentation to a collection called "solidity"
web3cli vdb-add-docs https://docs.soliditylang.org/ --name solidity --crawl

# Search your Solidity collection
web3cli vdb-search "how to handle errors in solidity" --name solidity

# Add a local smart contract to your collection
web3cli vdb-add-file ./contracts/MyContract.sol --name my-project
```

## Configuration

Create a `web3cli.toml` file in your project directory with the following:

```toml
#:schema ./schema.json
default_model = "gpt-4o-mini" # or another model
openai_api_key = "your-openai-api-key"
etherscan_api_key = "your-etherscan-api-key" # optional
```

## Setup Quick Documentation

Run the setup command to quickly index documentation for common Web3 technologies:

```bash
web3cli setup --max-pages 50
```

This will create the following collections:
- solidity
- ethers
- hardhat
- openzeppelin
