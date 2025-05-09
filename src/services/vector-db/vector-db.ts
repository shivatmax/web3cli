/**
 * Vector Database Service
 * 
 * This module provides functionality for storing and retrieving documents
 * using vector embeddings for semantic search.
 */
import fs from "node:fs";
import path from "node:path";
import { configDirPath } from "../config/config";

/**
 * Document with vector embedding
 */
export interface Document {
  id: string;
  text: string;
  embedding?: number[];
  metadata?: Record<string, any>;
}

/**
 * Vector database options for adding documents
 */
export interface VectorDBOptions {
  crawl?: boolean;
  maxPages?: number;
}

/**
 * Simple vector database implementation
 * 
 * In a real implementation, this would use a proper vector database
 * like Pinecone, Weaviate, or Qdrant
 */
export class VectorDB {
  private collections: Record<string, Document[]>;
  private dbPath: string;
  
  constructor() {
    this.collections = {};
    this.dbPath = path.join(configDirPath, "vector-db");
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }
    
    // Load collections
    this.loadCollections();
  }
  
  /**
   * Load collections from disk
   */
  private loadCollections(): void {
    try {
      // Get collection files
      const files = fs.readdirSync(this.dbPath);
      
      // Load each collection
      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          const collectionName = file.replace('.jsonl', '');
          const content = fs.readFileSync(path.join(this.dbPath, file), 'utf-8');
          
          // Parse JSONL
          this.collections[collectionName] = content
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));
          
          console.log(`Loaded collection ${collectionName} with ${this.collections[collectionName].length} documents`);
        }
      }
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  }
  
  /**
   * Save a collection to disk
   * 
   * @param name Collection name
   */
  private saveCollection(name: string): void {
    const collection = this.collections[name] || [];
    const content = collection.map(doc => JSON.stringify(doc)).join('\n');
    fs.writeFileSync(path.join(this.dbPath, `${name}.jsonl`), content);
  }
  
  /**
   * Add documents to a collection
   * 
   * @param collectionName Collection name
   * @param url URL to fetch documents from
   * @param options Options for adding documents
   * @returns Number of documents added
   */
  async addDocs(
    collectionName: string,
    url: string,
    options: VectorDBOptions = {}
  ): Promise<number> {
    // In a real implementation, this would:
    // 1. Fetch content from the URL
    // 2. Parse and split into chunks
    // 3. Generate embeddings for each chunk
    // 4. Store in the vector database
    
    // For now, just add a mock document
    const mockDoc: Document = {
      id: `doc-${Date.now()}`,
      text: `Sample document from ${url}`,
      metadata: { source: url }
    };
    
    // Create collection if it doesn't exist
    if (!this.collections[collectionName]) {
      this.collections[collectionName] = [];
    }
    
    // Add document
    this.collections[collectionName].push(mockDoc);
    
    // Save collection
    this.saveCollection(collectionName);
    
    return 1; // Return number of documents added
  }
  
  /**
   * Perform similarity search on a collection
   * 
   * @param collectionName Collection name
   * @param query Query text
   * @param limit Maximum number of results
   * @returns Matching documents
   */
  async similaritySearch(
    collectionName: string,
    query: string,
    limit: number = 5
  ): Promise<Document[]> {
    // In a real implementation, this would:
    // 1. Generate embedding for the query
    // 2. Find closest documents by vector similarity
    
    console.log(`Performing similarity search in "${collectionName}" for: ${query}`);
    
    // Mock implementation: just return some documents based on text match
    const collection = this.collections[collectionName] || [];
    
    // Sort by simple text similarity (not real vector similarity)
    const results = collection
      .filter(doc => doc.text.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);
    
    // If no direct matches, return some default docs
    if (results.length === 0 && collection.length > 0) {
      return collection.slice(0, Math.min(limit, collection.length));
    }
    
    return results;
  }
}

/**
 * For testing purposes
 */
export function createMockVectorDB(): VectorDB {
  const db = new VectorDB();
  
  // Add mock security patterns
  if (!fs.existsSync(path.join(configDirPath, "vector-db", "security-patterns.jsonl"))) {
    const patterns = [
      {
        id: "sec-001",
        text: "Always check for integer overflow and underflow when performing arithmetic operations in Solidity."
      },
      {
        id: "sec-002",
        text: "Use the nonReentrant modifier from OpenZeppelin's ReentrancyGuard to protect functions that make external calls."
      },
      {
        id: "sec-003",
        text: "Validate all inputs in public and external functions to prevent unexpected behavior."
      },
      {
        id: "sec-004",
        text: "When implementing ERC-20 tokens, consider using OpenZeppelin's implementation which follows best practices."
      },
      {
        id: "sec-005",
        text: "Use access control modifiers like onlyOwner to restrict sensitive functions."
      }
    ];
    
    db['collections']['security-patterns'] = patterns.map((p, i) => ({
      id: p.id,
      text: p.text,
      metadata: { source: "security-best-practices", index: i }
    }));
    
    db['saveCollection']('security-patterns');
  }
  
  return db;
} 