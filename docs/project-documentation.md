# Web3CLI: AI-Powered Smart Contract Tool

A comprehensive suite for generating secure Solidity smart contracts and analyzing existing contracts using AI.

## Overview

Web3CLI is a powerful developer tool that leverages AI to solve two key problems in blockchain development:

1. **Natural Language to Smart Contract Logic** - Translates requirements into secure, minimal Solidity code
2. **Smart Contract Explainability** - Provides plain-English summaries of complex smart contracts

The tool uses advanced AI models with specialized guardrails to ensure secure code generation, supported by a multi-agent system, web search, and vector database integration for enhanced security and quality.

## Installation and Configuration

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




### Configuration

Create a configuration file in your project directory:

```bash
# Create a web3cli.toml file
touch web3cli.toml
```

Edit the file with your preferred settings:

```toml
#:schema ./schema.json
default_model = "gpt-4o-mini"
openai_api_key = "your-openai-api-key"
etherscan_api_key = "your-etherscan-api-key"
```

Alternatively, set environment variables:

```bash
export OPENAI_API_KEY="your-openai-api-key"
export ETHERSCAN_API_KEY="your-etherscan-api-key"
```

## Key Features

### Core Features

- **Natural Language to Solidity Code** - Generate smart contracts from plain English
- **Security-First Approach** - Built-in guardrails to prevent insecure patterns
- **Contract Explainability** - Analyze contracts for permissions and security patterns
- **Multi-Agent System** - Specialized agents collaborate to enhance quality
- **Vector Database** - Local storage of blockchain documentation and security patterns
- **Web Search** - Up-to-date information for secure implementations
- **CLI and Terminal Interface** - Developer-friendly command-line tools

### Agent System

The system employs a hierarchical multi-agent approach with specialized agents:

- **Coordinator Agent** - Orchestrates the entire workflow
- **Code Writer Agent** - Translates requirements into initial Solidity code
- **Security Audit Agent** - Identifies and remedies security vulnerabilities
- **Linting Agent** - Ensures code quality and style consistency
- **Functionality Checker** - Verifies contract behavior against requirements
- **Web Search Agent** - Retrieves up-to-date information from the web
- **Vector Store Agent** - Accesses relevant security patterns and documentation

#### Agent Workflow

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

### Vector Database Integration

- Stores blockchain and Solidity documentation
- Maintains security patterns and best practices
- Enables semantic search for relevant context
- Supports RAG (Retrieval Augmented Generation) for high-quality outputs

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

### Task 1: Natural Language to Smart Contract

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

### Task 2: Smart Contract Explainability

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

## Example Queries and Responses

### Example 1: ERC-20 Token with Allowlist

**Query:**
```
Create an ERC-20 token with minting restricted to addresses in an allowlist
```

**Response:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AllowlistedERC20
 * @dev ERC20 token with minting restricted to addresses in an allowlist
 */
contract AllowlistedERC20 is ERC20, Ownable, ReentrancyGuard {
    mapping(address => bool) public minters;
    
    event MinterAdded(address indexed account);
    event MinterRemoved(address indexed account);
    
    constructor(string memory name, string memory symbol) 
        ERC20(name, symbol) 
        Ownable(msg.sender) 
    {}
    
    /**
     * @notice Modifier to restrict function access to approved minters
     */
    modifier onlyMinter() {
        require(minters[msg.sender], "AllowlistedERC20: caller is not a minter");
        _;
    }
    
    /**
     * @notice Add an address to the minter allowlist
     * @param account Address to add as a minter
     */
    function addMinter(address account) external onlyOwner {
        require(account != address(0), "Cannot add zero address as minter");
        require(!minters[account], "Address is already a minter");
        minters[account] = true;
        emit MinterAdded(account);
    }
    
    /**
     * @notice Remove an address from the minter allowlist
     * @param account Address to remove from minters
     */
    function removeMinter(address account) external onlyOwner {
        require(minters[account], "Address is not a minter");
        minters[account] = false;
        emit MinterRemoved(account);
    }
    
    /**
     * @notice Check if an address is a minter
     * @param account Address to check
     * @return bool True if the address is a minter
     */
    function isMinter(address account) external view returns (bool) {
        return minters[account];
    }
    
    /**
     * @notice Mint new tokens and assign them to an address
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyMinter nonReentrant {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        _mint(to, amount);
    }
}
```

**Security Considerations:**
```
- Used ReentrancyGuard to protect mint function from reentrancy attacks
- Added zero-address checks to prevent tokens being minted to address(0)
- Implemented event emissions for allowlist changes for better transparency
- Used explicit visibility modifiers for all functions
- Implemented proper access control with onlyOwner and onlyMinter modifiers
- Added input validation to all critical functions
```

### Example 2: Contract Explainability

**Query:**
```
Explain 0x1234567890123456789012345678901234567890
```

**Response:**
```
# Contract Analysis: MyNFTCollection

## Key Functions
- mint(address to, uint256 tokenId): Mints a new NFT to the specified address
- setBaseURI(string memory baseURI): Sets the base URI for token metadata
- withdraw(): Allows owner to withdraw contract funds
- setRoyaltyInfo(address receiver, uint96 feeNumerator): Sets royalty information

## Permissions
- Owner: Can mint NFTs, set base URI, withdraw funds, and configure royalty info
- Users: Can transfer owned NFTs and view metadata

## Security Patterns
- Implements ERC-721 with enumeration and URI storage extensions
- Uses OpenZeppelin's Ownable for access control
- Implements EIP-2981 for royalty support
- Properly validates inputs in mint function
- Uses ReentrancyGuard for withdraw function

## Additional Notes
- Royalty fee set to 5% (500 basis points)
- No pause mechanism implemented
- Uses counter for sequential token IDs
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

### CLI Interface
- Chosen for developer-friendly workflow integration
- Simpler than web interface but more accessible to target audience
- Allows for scripting and automation

## Scaling Considerations

### Caching
- **Contract Templates**: Cached commonly requested patterns
- **Vector Database**: Pre-processed security patterns and documentation
- **Analysis Results**: Store previous contract analyses

### Distributed Architecture
- Move from local vector DB to distributed solution (Pinecone, etc.)
- Add API gateway for rate limiting and load balancing
- Containerize for consistent deployment

## Risks of LLM-Generated Code in Blockchain

### Security Vulnerabilities
- LLMs may generate code with subtle security flaws
- Mitigation: Multi-agent security review and explicit security notes

### Outdated Patterns
- LLMs trained on older code may use deprecated patterns
- Mitigation: Up-to-date vector database and web search

### Hallucinated Features
- LLMs might "hallucinate" non-existent Solidity features
- Mitigation: Validation against known standards and compiler versions

### Over-reliance
- Developers may over-trust generated code
- Mitigation: Clear warnings that generated code requires review

## Project Structure

```
web3cli/
├── docs/                # Documentation
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
│   ├── services/        # Core services
│   │   ├── ai/              # AI model integration
│   │   ├── contract/        # Contract generation
│   │   ├── search/          # Search services
│   │   ├── vector-db/       # Vector database
│   │   └── config/          # Configuration
│   └── utils/           # Shared utilities
├── templates/           # Reusable contract templates
└── web/                 # Web interface (future)
``` 

## Conclusion

Web3CLI represents a significant advancement in AI-assisted blockchain development. By leveraging AI models with specialized guardrails, it addresses the critical challenges of secure smart contract generation and explainability. The multi-agent system provides enhanced quality control that single-model approaches cannot match.

### Future Plans

1. **Formal Verification Integration** - Connect with formal verification tools for critical contracts
2. **Gas Optimization Analysis** - Add detailed gas estimation and optimization suggestions
3. **Custom Documentation Integration** - Allow developers to add proprietary documentation
4. **Web Interface** - Develop a web-based UI for easier adoption
5. **Expanded Chain Support** - Add support for additional EVM-compatible chains