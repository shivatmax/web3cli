# Vector Database for Web3CLI

This document explains the vector database implementation in Web3CLI, a specialized tool for Web3 developers.

## Overview

Web3CLI includes a local vector database that uses OpenAI embeddings to store and retrieve documents for semantic search. This implementation allows you to:

1. Add documents from URLs with automatic HTML content extraction
2. Crawl websites recursively to build a knowledge base
3. Add local files to the vector database
4. Search for relevant content using semantic similarity
5. Augment AI queries with relevant information (RAG - Retrieval Augmented Generation)

## Architecture

The vector database implementation uses:

- **OpenAI Embeddings**: To convert text into vector representations
- **LangChain's MemoryVectorStore**: For local in-memory storage with persistence to disk
- **Cheerio**: To parse and extract text content from HTML documents
- **RecursiveCharacterTextSplitter**: To chunk documents into manageable pieces

## Storage

Documents are stored in a `.vector-db` directory in the project root. The storage includes:

- `collections.json`: Metadata about all collections
- `[collection-name].json`: Stored documents for each collection

## CLI Commands

### Add Documents from URL

```bash
web3cli vector-db add-docs https://docs.example.com --name my-collection
```

Options:
- `--name`: Collection name (default: 'default')
- `--crawl`: Enable recursive crawling
- `--max-pages`: Maximum pages to crawl (default: 30)
- `--max-depth`: Maximum crawl depth (default: 3)

### Add File

```bash
web3cli vector-db add-file ./my-document.md --name my-collection
```

Options:
- `--name`: Collection name (default: 'default')
- `--title`: Document title (default: filename)

### Search

```bash
web3cli vector-db search "how does staking work" --name solidity
```

Options:
- `--name`: Collection name (default: 'default')
- `-k`: Number of results to return (default: 5)

### List Collections

```bash
web3cli vector-db list
```

## Setup Documentation Collections

To set up documentation collections for common Web3 technologies:

```bash
web3cli setup --max-pages 50
```

This will crawl and index documentation for:
- Solidity
- Ethers.js
- Hardhat
- OpenZeppelin

## Integration with AI Queries

When using the main query command with the `--read-docs` option, the vector database is automatically used to augment the prompt with relevant information:

```bash
web3cli "How do I implement ERC721?" --read-docs solidity
```

This retrieves relevant information about ERC721 from the solidity collection and includes it in the context for the AI model, enhancing its ability to provide accurate and relevant information.

## Technical Details

### Embedding Model

The implementation uses OpenAI's `text-embedding-3-small` model, which provides:
- 1536-dimensional embeddings
- Excellent semantic understanding
- Cost-effective API usage

### Text Chunking

Documents are chunked into smaller pieces:
- Default chunk size: 1000 characters
- Default overlap: 200 characters

These parameters can be customized in the configuration.

## Configuration

Vector database settings can be configured in the Web3CLI configuration file:

```toml
[vector_db_settings]
chunk_size = 1000
chunk_overlap = 200
embedding_model = "text-embedding-3-small"
``` 