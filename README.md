# Web3CLI: AI-Powered Smart Contract Generator

Generate secure Solidity smart contracts from natural language using AI.

## Features

- **Natural Language to Solidity**: Translate requirements into secure, minimal code
- **Security First**: Built-in guardrails and security best practices
- **Documentation**: Automatic security considerations and explanations
- **Agent Mode**: Hierarchical multi-agent system for enhanced security and quality (NEW!)
- **Blockchain Integration**: Uses ethers.js to fetch contract data from deployed addresses (NEW!)

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
- `ETHERSCAN_API_KEY` (needed for verified contract source code retrieval)

## Usage

Generate a smart contract from natural language:

```bash
web3cli generate "Create an ERC-20 token with minting restricted to addresses in an allowlist" --output Token.sol
```

Explain an existing smart contract:

```bash
web3cli explain 0x1234567890123456789012345678901234567890 --network sepolia
# or
web3cli explain MyContract.sol
```

When analyzing on-chain contracts, the tool will:
- Fetch the contract bytecode using ethers.js
- Retrieve the contract ABI and source code if verified on Etherscan
- Reconstruct the contract interface from the ABI when source code is unavailable
- Work with multiple networks (sepolia, goerli, mainnet)

### Contract Commands (New)

Work with smart contracts using specialized commands:

```bash
# Explain a contract
web3cli contract MyContract.sol
# or
web3cli contract explain MyContract.sol

# Audit a contract for security vulnerabilities
web3cli contract audit MyContract.sol --output audit-report.md

# Audit and get fixed code
web3cli contract audit MyContract.sol --fix --output audit-report.md

# Make custom requests about a contract
web3cli contract request MyContract.sol "Explain the gas optimization opportunities"
web3cli contract request MyContract.sol "What's the upgrade path for this contract?" --web
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

### Generate Command
- `--model <model>`: Specify the model to use (default: gpt-4o)
- `--output <file>`: Output file for the generated contract
- `--hardhat`: Generate Hardhat test file
- `--agent`: Use hierarchical multi-agent mode (experimental)
- `--files <files...>`: Additional context files
- `--url <urls...>`: URLs to fetch as context
- `--search`: Enable web search for context
- `--read-docs <collection>`: Read from vector DB docs collection

### Contract Commands

#### Common Options
- `--model <model>`: Specify the model to use (default: gpt-4o)
- `--network <network>`: Ethereum network for on-chain contracts (default: sepolia)
- `--output <file>`: Output file for results
- `--read-docs <collection>`: Read from vector DB docs collection
- `--no-stream`: Disable streaming output

#### Audit Options
- `--fix`: Generate fixed code addressing the vulnerabilities

#### Request Options
- `--web`: Enable web search for additional context

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
