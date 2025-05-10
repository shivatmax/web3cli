/**
 * Vector Database Service
 *
 * A local vector database implementation using OpenAI embeddings
 * and LangChain's MemoryVectorStore for storage.
 */
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import { loadConfig } from "../config/config";

// Define types
interface VectorDBOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  collections?: Record<string, MemoryVectorStore>;
}

interface CrawlOptions {
  crawl?: boolean;
  maxPages?: number;
  maxDepth?: number;
}

export class VectorDB {
  private embeddings: OpenAIEmbeddings;
  private collections: Record<string, MemoryVectorStore>;
  private textSplitter: RecursiveCharacterTextSplitter;
  private dataDir: string;

  constructor(options: VectorDBOptions = {}) {
    const config = loadConfig();
    
    // Initialize OpenAI embeddings with fixed model name and batch size
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.openai_api_key,
      modelName: "text-embedding-ada-002", // Use older model for better compatibility
      batchSize: 512, // Process embeddings in smaller batches
      stripNewLines: true, // Remove newlines to avoid errors
    });

    // Initialize text splitter for chunking documents
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: options.chunkSize || 500, // Smaller chunks for better embedding
      chunkOverlap: options.chunkOverlap || 100,
    });

    // Set up data directory
    this.dataDir = path.join(process.cwd(), ".vector-db");
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Initialize collections
    this.collections = options.collections || {};
    this.loadCollections();
  }

  /**
   * Load all collections from disk
   */
  private async loadCollections(): Promise<void> {
    try {
      // Ensure data directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
        return; // No collections to load if directory was just created
      }
      
      const collectionsPath = path.join(this.dataDir, "collections.json");
      
      if (!fs.existsSync(collectionsPath)) {
        console.log("No collections metadata file found.");
        return;
      }
      
      const collectionsData = JSON.parse(fs.readFileSync(collectionsPath, "utf-8"));
      
      for (const [name, data] of Object.entries(collectionsData)) {
        console.log(`Loading collection: ${name}`);
        const collectionPath = path.join(this.dataDir, `${name}.json`);
        
        if (fs.existsSync(collectionPath)) {
          try {
            const jsonData = fs.readFileSync(collectionPath, "utf-8");
            const documentData = JSON.parse(jsonData);
            
            if (!Array.isArray(documentData)) {
              console.warn(`Invalid document data in collection ${name}, expected array`);
              continue;
            }
            
            // Filter out invalid documents
            const validDocs = documentData
              .filter((doc: any) => {
                // Print every document for debugging
                console.log(`Validating document: ${JSON.stringify(doc).substring(0, 100)}...`);
                
                // More lenient validation to accept any document with content
                return doc && 
                       (doc.pageContent !== undefined || 
                        (doc.metadata && Object.keys(doc.metadata).length > 0));
              })
              .map((doc: any) => {
                // Ensure we have a valid Document object
                return new Document({
                  pageContent: doc.pageContent || "No content",
                  metadata: doc.metadata || {}
                });
              });
            
            if (validDocs.length > 0) {
              console.log(`Found ${validDocs.length} valid documents in collection: ${name}`);
              this.collections[name] = await MemoryVectorStore.fromDocuments(validDocs, this.embeddings);
            } else {
              console.warn(`No valid documents found in collection: ${name}`);
            }
          } catch (error) {
            console.error(`Error loading collection ${name}:`, error);
          }
        } else {
          console.warn(`Collection file not found: ${collectionPath}`);
        }
      }
    } catch (error) {
      console.error("Error loading collections:", error);
    }
  }

  /**
   * Save collections metadata to disk
   */
  private async saveCollectionsMetadata(): Promise<void> {
    try {
      // Create a metadata object with all collections
      const collectionsData = Object.keys(this.collections).reduce((acc, name) => {
        acc[name] = { name, timestamp: new Date().toISOString() };
        return acc;
      }, {} as Record<string, any>);
      
      // Ensure data directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      
      const collectionsPath = path.join(this.dataDir, "collections.json");
      
      console.log(`Saving metadata for ${Object.keys(collectionsData).length} collections: ${Object.keys(collectionsData).join(', ')}`);
      
      fs.writeFileSync(collectionsPath, JSON.stringify(collectionsData, null, 2));
    } catch (error) {
      console.error("Error saving collections metadata:", error);
    }
  }

  /**
   * Save a specific collection to disk
   */
  private async saveCollection(name: string): Promise<void> {
    const collection = this.collections[name];
    if (!collection) return;

    try {
      // Get the document vectors - in MemoryVectorStore the documents are stored in memoryVectors
      // Access the internal documents and metadata for saving
      const vectorsData = (collection as any).memoryVectors;
      
      if (!vectorsData || !Array.isArray(vectorsData) || vectorsData.length === 0) {
        console.log(`No vectors to save in collection: ${name}`);
        return;
      }
      
      // Create a serializable format
      const documentsToSave = vectorsData.map((item: any) => ({
        pageContent: item.pageContent, 
        metadata: item.metadata
      }));
      
      // Ensure data directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      
      // Write the document data to a file
      const collectionPath = path.join(this.dataDir, `${name}.json`);
      fs.writeFileSync(collectionPath, JSON.stringify(documentsToSave, null, 2));
      
      // Update the collections metadata
      await this.saveCollectionsMetadata();
      
      console.log(`Successfully saved ${documentsToSave.length} documents to collection: ${name}`);
    } catch (error) {
      console.error(`Error saving collection ${name}:`, error);
    }
  }

  /**
   * Get a collection, creating it if it doesn't exist
   */
  private async getCollection(name: string): Promise<MemoryVectorStore> {
    // Check if the collection is already loaded in memory
    if (this.collections[name]) {
      console.log(`Using existing collection from memory: ${name}`);
      
      // Debug: Check if the collection has vectors
      const memoryVectors = (this.collections[name] as any).memoryVectors;
      console.log(`Collection has ${memoryVectors ? memoryVectors.length : 0} vectors in memory`);
      
      return this.collections[name];
    }
    
    // If not in memory, try to load from disk
    const collectionPath = path.join(this.dataDir, `${name}.json`);
    
    if (fs.existsSync(collectionPath)) {
      try {
        console.log(`Loading collection from disk: ${name}`);
        const jsonData = fs.readFileSync(collectionPath, "utf-8");
        console.log(`Read ${jsonData.length} bytes from file`);
        
        const documentData = JSON.parse(jsonData);
        console.log(`Parsed JSON data with ${documentData ? documentData.length : 0} entries`);
        
        if (!Array.isArray(documentData)) {
          console.warn(`Invalid document data in collection ${name}, expected array`);
        } else {
          // Filter out invalid documents
          const validDocs = documentData
            .filter((doc: any) => {
              // Print every document for debugging
              console.log(`Validating document: ${JSON.stringify(doc).substring(0, 100)}...`);
              
              // More lenient validation to accept any document with content
              return doc && 
                     (doc.pageContent !== undefined || 
                      (doc.metadata && Object.keys(doc.metadata).length > 0));
            })
            .map((doc: any) => {
              // Ensure we have a valid Document object
              return new Document({
                pageContent: doc.pageContent || "No content",
                metadata: doc.metadata || {}
              });
            });
          
          console.log(`Found ${validDocs.length} valid documents out of ${documentData.length}`);
          
          if (validDocs.length > 0) {
            console.log(`Creating MemoryVectorStore from ${validDocs.length} documents`);
            
            // Manually create embeddings for debugging
            try {
              // Create vectors store with logging
              this.collections[name] = await MemoryVectorStore.fromDocuments(
                validDocs, 
                this.embeddings
              );
              
              // Check if vectors were created properly
              const vectors = (this.collections[name] as any).memoryVectors || [];
              console.log(`Created store with ${vectors.length} embeddings`);
              
              return this.collections[name];
            } catch (error) {
              console.error(`Error creating embeddings for collection ${name}:`, error);
            }
          } else {
            console.warn(`No valid documents found in collection: ${name}`);
          }
        }
      } catch (error) {
        console.error(`Error loading collection ${name}:`, error);
      }
    } else {
      console.warn(`Collection file not found: ${collectionPath}`);
    }
    
    // If we get here, either the collection doesn't exist or couldn't be loaded
    console.log(`Creating new collection: ${name}`);
    this.collections[name] = new MemoryVectorStore(this.embeddings);
    await this.saveCollectionsMetadata();
    return this.collections[name];
  }

  /**
   * Extract text content from HTML
   */
  private extractTextFromHTML(html: string): string {
    try {
      const $ = cheerio.load(html);
      
      // Remove script and style elements
      $("script, style, nav, footer, header").remove();
      
      // Extract main content from common content areas
      const mainContent = $("main, article, .content, .documentation, .docs, #content, #main");
      
      // If we found main content areas, use them
      if (mainContent.length > 0) {
        return mainContent.text().trim();
      }
      
      // Otherwise extract from body
      return $("body").text().trim();
    } catch (error) {
      console.error("Error extracting text from HTML:", error);
      return "";
    }
  }

  /**
   * Extract links from HTML that are on the same domain
   */
  private extractLinks(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const links: string[] = [];
    const baseUrlObj = new URL(baseUrl);
    
    $("a").each((_, element) => {
      const href = $(element).attr("href");
      if (!href) return;
      
      try {
        // Handle relative and absolute URLs
        let fullUrl: URL;
        if (href.startsWith("http")) {
          fullUrl = new URL(href);
        } else {
          fullUrl = new URL(href, baseUrl);
        }
        
        // Only include links from the same domain
        if (fullUrl.hostname === baseUrlObj.hostname) {
          links.push(fullUrl.href);
        }
      } catch (error) {
        // Skip invalid URLs
      }
    });
    
    return [...new Set(links)]; // Remove duplicates
  }

  /**
   * Add documents from a URL to the vector database
   */
  public async addDocs(
    collectionName: string,
    url: string,
    options: CrawlOptions = {}
  ): Promise<number> {
    try {
      const collection = await this.getCollection(collectionName);
      const processedUrls = new Set<string>();
      const urlQueue: { url: string; depth: number }[] = [{ url, depth: 0 }];
      let addedChunks = 0;
      
      // Limit max pages to 30 regardless of user input
      const maxPages = Math.min(options.maxPages || 30, 30);
      const maxDepth = options.maxDepth || 3;
      
      console.log(`Max pages: ${maxPages}, Max depth: ${maxDepth}`);
      
      while (urlQueue.length > 0 && processedUrls.size < maxPages) {
        const { url: currentUrl, depth } = urlQueue.shift()!;
        
        if (processedUrls.has(currentUrl)) continue;
        processedUrls.add(currentUrl);
        
        console.log(`Fetching ${currentUrl} (depth: ${depth})`);
        
        try {
          // Fetch and process page
          const response = await axios.get(currentUrl);
          const html = response.data;
          const text = this.extractTextFromHTML(html);
          
          if (!text || text.trim().length === 0) {
            console.log(`No usable text content found in ${currentUrl}`);
            continue;
          }
          
          // Create docs from text chunks
          const docs = await this.textSplitter.createDocuments([text], [{ 
            source: currentUrl,
            title: currentUrl.split("/").pop() || currentUrl
          }]);
          
          // Add documents to vector store
          if (docs.length > 0) {
            await collection.addDocuments(docs);
            addedChunks += docs.length;
          }
          
          // If crawling is enabled and we're not at max depth, add links to queue
          if (options.crawl && depth < maxDepth) {
            const links = this.extractLinks(html, currentUrl);
            
            for (const link of links) {
              if (!processedUrls.has(link)) {
                urlQueue.push({ url: link, depth: depth + 1 });
              }
            }
          }
        } catch (error) {
          console.error(`Error processing ${currentUrl}:`, error);
        }
        
        // Wait a moment to be nice to the server
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Save the collection
      if (addedChunks > 0) {
        console.log(`Saving ${addedChunks} chunks to collection ${collectionName}`);
        await this.saveCollection(collectionName);
      }
      
      return addedChunks;
    } catch (error) {
      console.error(`Error adding documents to collection ${collectionName}:`, error);
      return 0;
    }
  }

  /**
   * Add a file to the vector database
   */
  public async addFile(
    collectionName: string,
    filePath: string,
    metadata: Record<string, any> = {}
  ): Promise<number> {
    const collection = await this.getCollection(collectionName);
    
    // Read file content
    const text = fs.readFileSync(filePath, "utf-8");
    
    if (!text || text.trim().length === 0) {
      console.log(`No usable text content found in ${filePath}`);
      return 0;
    }
    
    // Create docs from text chunks
    const docs = await this.textSplitter.createDocuments([text], [{
      source: filePath,
      ...metadata
    }]);
    
    // Add documents to vector store
    if (docs.length > 0) {
      await collection.addDocuments(docs);
      
      // Save the collection
      await this.saveCollection(collectionName);
      
      return docs.length;
    }
    
    return 0;
  }

  /**
   * Search for similar documents in a collection
   */
  public async search(
    collectionName: string,
    query: string,
    k: number = 5
  ): Promise<Document[]> {
    try {
      console.log(`Searching in collection: ${collectionName}`);
      
      if (!query || query.trim().length === 0) {
        throw new Error("Search query cannot be empty");
      }
      
      // Get the collection, loading it if necessary
      const collection = await this.getCollection(collectionName);
      
      // Check if the collection has documents
      const vectorsData = (collection as any).memoryVectors;
      if (!vectorsData || !Array.isArray(vectorsData) || vectorsData.length === 0) {
        console.log(`Collection ${collectionName} has no documents to search`);
        return [];
      }
      
      console.log(`Performing similarity search with ${vectorsData.length} documents`);
      const results = await collection.similaritySearch(query, k);
      console.log(`Found ${results.length} results for query: "${query}"`);
      
      return results;
    } catch (error) {
      console.error(`Error searching collection ${collectionName}:`, error);
      return [];
    }
  }

  /**
   * List all available collections
   */
  public async listCollections(): Promise<string[]> {
    // Check if collections directory exists and has files
    try {
      const collectionsPath = path.join(this.dataDir, "collections.json");
      
      if (fs.existsSync(collectionsPath)) {
        const collectionsData = JSON.parse(fs.readFileSync(collectionsPath, "utf-8"));
        // Return the collection names that have corresponding files
        const collectionNames = Object.keys(collectionsData);
        
        // Verify each collection has a file
        const validCollections = collectionNames.filter(name => {
          const collectionPath = path.join(this.dataDir, `${name}.json`);
          if (fs.existsSync(collectionPath)) {
            return true;
          } else {
            console.warn(`Collection metadata exists for ${name} but file is missing`);
            return false;
          }
        });
        
        if (validCollections.length === 0) {
          console.log("No valid collections found with existing files");
        } else {
          console.log(`Found ${validCollections.length} collections: ${validCollections.join(', ')}`);
        }
        
        return validCollections;
      } else {
        console.log("No collections metadata file found");
        return [];
      }
    } catch (error) {
      console.error("Error listing collections:", error);
      return [];
    }
  }

  /**
   * Add text directly to the vector database
   */
  public async addText(
    collectionName: string,
    text: string,
    metadata: Record<string, any> = {}
  ): Promise<number> {
    try {
      if (!text || text.trim().length === 0) {
        console.log(`No usable text content provided`);
        return 0;
      }
      
      const collection = await this.getCollection(collectionName);
      
      // Create docs from text chunks
      const docs = await this.textSplitter.createDocuments([text], [{
        ...metadata
      }]);
      
      // Add documents to vector store
      if (docs.length > 0) {
        console.log(`Adding ${docs.length} chunks from text to collection ${collectionName}`);
        await collection.addDocuments(docs);
        
        // Save the collection
        await this.saveCollection(collectionName);
        
        return docs.length;
      }
      
      return 0;
    } catch (error) {
      console.error(`Error adding text to collection ${collectionName}:`, error);
      return 0;
    }
  }
} 