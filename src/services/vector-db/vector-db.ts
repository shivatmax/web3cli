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
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { parse as parseHTML } from "node-html-parser";

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

// Extracted content structure
interface ExtractedContent {
  title: string;
  content: string;
  textContent: string;
  excerpt?: string;
  siteName?: string;
  author?: string;
  success: boolean;
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
        return;
      }
      
      const collectionsData = JSON.parse(fs.readFileSync(collectionsPath, "utf-8"));
      
      for (const [name, data] of Object.entries(collectionsData)) {
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
                // More lenient validation to accept any document with content
                return doc && 
                       (doc.pageContent !== undefined || 
                        (doc.metadata && Object.keys(doc.metadata).length > 0));
              })
              .map((doc: any) => {
                // Ensure we have a valid Document object with content
                return new Document({
                  pageContent: doc.pageContent && doc.pageContent.trim() !== "" 
                    ? doc.pageContent 
                    : "This document contains no extractable text content.",
                  metadata: doc.metadata || {}
                });
              });
            
            if (validDocs.length > 0) {
              this.collections[name] = await MemoryVectorStore.fromDocuments(validDocs, this.embeddings);
            }
          } catch (error) {
            console.error(`Error loading collection ${name}:`, error);
          }
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
      let existingData: Record<string, any> = {};
      const collectionsPath = path.join(this.dataDir, "collections.json");
      
      // First read existing collections file if it exists
      if (fs.existsSync(collectionsPath)) {
        try {
          existingData = JSON.parse(fs.readFileSync(collectionsPath, "utf-8"));
        } catch (readError) {
          console.error("Error reading existing collections metadata:", readError);
          // Continue with empty object if file is corrupted
        }
      }
      
      // Update with current in-memory collections
      const collectionsData = Object.keys(this.collections).reduce((acc, name) => {
        acc[name] = { 
          name, 
          timestamp: new Date().toISOString(),
          updated: true
        };
        return acc;
      }, existingData);
      
      // Ensure data directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      
      fs.writeFileSync(collectionsPath, JSON.stringify(collectionsData, null, 2));
    } catch (error) {
      console.error("Error saving collections metadata:", error);
    }
  }

  /**
   * Save a specific collection to disk
   */
  public async saveCollection(name: string): Promise<void> {
    const collection = this.collections[name];
    if (!collection) return;

    try {
      // Get the document vectors - in MemoryVectorStore the documents are stored in memoryVectors
      // Access the internal documents and metadata for saving
      const vectorsData = (collection as any).memoryVectors;
      
      if (!vectorsData || !Array.isArray(vectorsData) || vectorsData.length === 0) {
        return;
      }
      
      // Create a serializable format
      const documentsToSave = vectorsData.map((item: any) => {
        // Ensure pageContent is never empty
        const pageContent = item.pageContent && item.pageContent.trim() !== "" 
          ? item.pageContent 
          : "This document contains no extractable text content.";
        
        return {
          pageContent: pageContent,
          metadata: item.metadata || {}
        };
      });
      
      // Ensure data directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      
      // Write the document data to a file
      const collectionPath = path.join(this.dataDir, `${name}.json`);
      fs.writeFileSync(collectionPath, JSON.stringify(documentsToSave, null, 2));
      
      // Update the collections metadata
      await this.saveCollectionsMetadata();
    } catch (error) {
      console.error(`Error saving collection ${name}:`, error);
    }
  }

  /**
   * Get a collection, creating it if it doesn't exist
   */
  public async getCollection(name: string): Promise<MemoryVectorStore> {
    // Check if the collection is already loaded in memory
    if (this.collections[name]) {
      return this.collections[name];
    }
    
    // If not in memory, try to load from disk
    const collectionPath = path.join(this.dataDir, `${name}.json`);
    
    if (fs.existsSync(collectionPath)) {
      try {
        const jsonData = fs.readFileSync(collectionPath, "utf-8");
        const documentData = JSON.parse(jsonData);
        
        if (!Array.isArray(documentData)) {
          console.warn(`Invalid document data in collection ${name}, expected array`);
        } else {
          // Filter out invalid documents
          const validDocs = documentData
            .filter((doc: any) => {
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
            // Create vectors store
            this.collections[name] = await MemoryVectorStore.fromDocuments(
              validDocs, 
              this.embeddings
            );
            
            // Always update metadata when loading a collection
            await this.saveCollectionsMetadata();
            return this.collections[name];
          }
        }
      } catch (error) {
        console.error(`Error loading collection ${name}:`, error);
      }
    }
    
    // If we get here, either the collection doesn't exist or couldn't be loaded
    this.collections[name] = new MemoryVectorStore(this.embeddings);
    
    // Make sure we save the metadata for this new collection
    await this.saveCollectionsMetadata();
    
    // Also create an empty collection file to ensure it's recognized by listCollections
    await this.saveCollection(name);
    
    return this.collections[name];
  }

  /**
   * Extract content from HTML using Mozilla's Readability
   * This provides high-quality content extraction similar to browser reader modes
   */
  private extractContentWithReadability(html: string, url: string): ExtractedContent {
    try {
      // Create a DOM document from the HTML
      const dom = new JSDOM(html, { url });
      
      // Add base element to handle relative URLs
      try {
        const head = dom.window.document.querySelector('head');
        if (head) {
          const base = dom.window.document.createElement('base');
          base.href = url;
          head.insertBefore(base, head.firstChild);
        }
      } catch (error) {
        console.error("Error adding base element:", error);
      }
      
      // Check if the document is readable
      const reader = new Readability(dom.window.document, {
        // Configure Readability options for better extraction
        keepClasses: true,
        charThreshold: 100, // More lenient threshold
        classesToPreserve: ['content', 'article', 'doc', 'documentation', 'post', 'text', 'body'],
      });
      
      const article = reader.parse();
      
      if (article && (article.textContent || article.content)) {
        // Try to extract structured content from HTML
        let fullTextContent = article.textContent || '';
        if (!fullTextContent || fullTextContent.trim().length < 100) {
          // If text content is too short, try to extract from content HTML
          if (article.content) {
            try {
              // Parse the content HTML
              const contentRoot = parseHTML(article.content);
              // Use simple HTML text extraction since we can't apply querySelectorAll here
              fullTextContent = this.extractTextFromHTML(article.content);
            } catch (parseError) {
              console.error("Error parsing article content:", parseError);
            }
          }
        }
        
        return {
          title: article.title || '',
          content: article.content || '',
          textContent: fullTextContent || article.textContent || article.content || '',
          excerpt: article.excerpt || '',
          siteName: article.siteName || '',
          author: article.byline || '',
          success: true
        };
      }
      
      // If Readability couldn't parse the document, fall back to node-html-parser
      return this.extractContentWithHTMLParser(html, url);
    } catch (error) {
      console.error("Error extracting content with Readability:", error);
      // Fall back to HTML parser if Readability fails
      return this.extractContentWithHTMLParser(html, url);
    }
  }
  
  /**
   * Extract content using node-html-parser as a fallback
   */
  private extractContentWithHTMLParser(html: string, url: string): ExtractedContent {
    try {
      const root = parseHTML(html);
      
      // Try to get title
      const titleElement = root.querySelector('title');
      const h1Element = root.querySelector('h1');
      const title = titleElement ? titleElement.text : 
                   h1Element ? h1Element.text : 
                   new URL(url).pathname.split('/').pop() || url;
      
      // Since we're having issues with node-html-parser, use cheerio as a reliable fallback
      // This avoids the querySelectorAll linting errors while still getting good content
      const $ = cheerio.load(html);
      
      // Remove non-content elements
      $("script, style, nav, footer, header, .sidebar, .navigation, .menu, .ads, .banner, .cookie, .popup").remove();
      
      // Get content from main areas first
      const mainSelectors = 'main, article, .content, .documentation, .docs, #content, #main, .article, .post, .entry, section';
      let mainContent = $(mainSelectors);
      
      // If no main content areas found, use body
      if (mainContent.length === 0) {
        mainContent = $('body');
      }
      
      // Extract all useful text
      let textContent = '';
      
      // Extract headings
      mainContent.find('h1, h2, h3, h4, h5, h6').each((i, el) => {
        const text = $(el).text().trim();
        if (text) {
          const level = parseInt(el.tagName.substring(1).toLowerCase());
          textContent += `\n${'#'.repeat(level)} ${text}\n\n`;
        }
      });
      
      // Extract paragraphs and other text containers
      mainContent.find('p, div > text, .text, [class*="text"], [class*="content"]').each((i, el) => {
        // Skip if this is inside an element we've already processed
        if ($(el).parents('h1, h2, h3, h4, h5, h6, li').length === 0) {
          const text = $(el).text().trim();
          if (text) {
            textContent += `${text}\n\n`;
          }
        }
      });
      
      // Extract lists
      mainContent.find('li').each((i, el) => {
        const text = $(el).text().trim();
        if (text) {
          textContent += `• ${text}\n`;
        }
      });
      
      // If we don't have much content yet, just get all the text
      if (textContent.trim().length < 100) {
        textContent = mainContent.text().trim();
      }
      
      // Clean up whitespace
      const cleanText = textContent
        .replace(/\s+/g, ' ')
        .trim();
      
      return {
        title,
        content: $.html(mainContent) || html,
        textContent: cleanText || "No content could be extracted from this page.",
        success: cleanText.length > 0
      };
    } catch (error) {
      console.error("Error extracting with HTML parser:", error);
      return {
        title: new URL(url).pathname.split('/').pop() || url,
        content: '',
        textContent: "Error extracting content from page.",
        success: false
      };
    }
  }
  
  /**
   * Extract headings from an HTML element
   */
  private extractHeadings(element: any): string {
    let result = '';
    
    try {
      const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
      
      for (const heading of headings) {
        const text = heading.text.trim();
        if (text) {
          const tagName = heading.tagName.toLowerCase();
          const level = parseInt(tagName.substring(1));
          const prefix = '#'.repeat(level) + ' ';
          result += `\n\n${prefix}${text}\n\n`;
        }
      }
    } catch (error) {
      console.error("Error extracting headings:", error);
    }
    
    return result;
  }
  
  /**
   * Extract paragraphs from an HTML element
   */
  private extractParagraphs(element: any): string {
    let result = '';
    
    try {
      const paragraphs = element.querySelectorAll('p, div > text, .text, [class*="text"], [class*="content"]');
      
      for (const p of paragraphs) {
        const text = p.text.trim();
        if (text) {
          result += `${text}\n\n`;
        }
      }
    } catch (error) {
      console.error("Error extracting paragraphs:", error);
    }
    
    return result;
  }
  
  /**
   * Extract lists from an HTML element
   */
  private extractLists(element: any): string {
    let result = '';
    
    try {
      const lists = element.querySelectorAll('ul, ol');
      
      for (const list of lists) {
        const items = list.querySelectorAll('li');
        
        for (const item of items) {
          const text = item.text.trim();
          if (text) {
            result += `• ${text}\n`;
          }
        }
        
        result += '\n';
      }
    } catch (error) {
      console.error("Error extracting lists:", error);
    }
    
    return result;
  }

  /**
   * Extract text content from HTML (enhanced method using cheerio)
   */
  private extractTextFromHTML(html: string): string {
    try {
      const $ = cheerio.load(html);
      
      // Remove non-content elements
      $("script, style, nav, footer, header, .sidebar, .menu, .ads, .banner, .cookie, .popup").remove();
      
      // Identify main content areas - this serves as a priority list
      const mainContentSelectors = [
        "main", "article", ".content", ".documentation", ".docs", "#content", 
        "#main", ".document", ".rst-content", ".body", ".post", ".entry", 
        "section", "[role=main]", ".main", ".article"
      ];
      
      let mainContent = null;
      
      // Try to find a main content area
      for (const selector of mainContentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          mainContent = element;
          break;
        }
      }
      
      // If no main content found, use body
      if (!mainContent || mainContent.length === 0) {
        mainContent = $("body");
      }
      
      // Get structured content
      let extractedText = "";
      
      // Extract headings with proper markdown format
      mainContent.find("h1, h2, h3, h4, h5, h6").each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 0) {
          const tagName = el.tagName.toLowerCase();
          const level = parseInt(tagName.substring(1));
          const prefix = '#'.repeat(level) + ' ';
          extractedText += `\n\n${prefix}${text}\n\n`;
        }
      });
      
      // Extract paragraphs
      mainContent.find("p").each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 0) {
          extractedText += `${text}\n\n`;
        }
      });
      
      // Extract div content (may contain paragraphs without proper tags)
      mainContent.find("div").each((i, el) => {
        // Only include divs that don't have extracted elements to avoid duplicates
        if ($(el).find("p, h1, h2, h3, h4, h5, h6, ul, ol").length === 0) {
          const text = $(el).text().trim();
          if (text.length > 0) {
            extractedText += `${text}\n\n`;
          }
        }
      });
      
      // Extract lists
      mainContent.find("ul, ol").each((i, listEl) => {
        $(listEl).find("li").each((j, liEl) => {
          const text = $(liEl).text().trim();
          if (text.length > 0) {
            extractedText += `• ${text}\n`;
          }
        });
        extractedText += "\n";
      });
      
      // Extract tables if any
      mainContent.find("table").each((i, tableEl) => {
        extractedText += "\nTable content:\n";
        
        $(tableEl).find("tr").each((j, trEl) => {
          const rowText: string[] = [];
          $(trEl).find("td, th").each((k, cellEl) => {
            rowText.push($(cellEl).text().trim());
          });
          
          if (rowText.length > 0) {
            extractedText += rowText.join(" | ") + "\n";
          }
        });
        
        extractedText += "\n";
      });
      
      // Extract pre/code blocks
      mainContent.find("pre, code").each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 0) {
          extractedText += `\n\`\`\`\n${text}\n\`\`\`\n\n`;
        }
      });
      
      // If we still don't have much content, grab all text content directly
      if (extractedText.trim().length < 100) {
        extractedText = mainContent.text().trim();
      }
      
      // Clean up the extracted text
      const cleanedText = extractedText
        .replace(/\n{3,}/g, '\n\n')  // Replace excessive newlines
        .replace(/\s+/g, ' ')        // Replace multiple spaces with a single space
        .trim();
      
      // Return a limited portion to avoid empty content
      return cleanedText.length > 0 
        ? cleanedText 
        : "No content could be extracted from this page.";
    } catch (error) {
      console.error("Error extracting text from HTML:", error);
      return "Error extracting content from page.";
    }
  }

  /**
   * Extract title from HTML
   */
  private extractTitleFromHTML(html: string, fallbackUrl: string): string {
    try {
      const $ = cheerio.load(html);
      
      // Try to get the title
      const title = $("title").text().trim();
      if (title) return title;
      
      // Try to get an h1
      const h1 = $("h1").first().text().trim();
      if (h1) return h1;
      
      // Use the URL's last segment as fallback
      return fallbackUrl.split("/").pop() || fallbackUrl;
    } catch (error) {
      return fallbackUrl.split("/").pop() || fallbackUrl;
    }
  }

  /**
   * Extract links from HTML that are on the same domain
   */
  private extractLinks(html: string, baseUrl: string): string[] {
    try {
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
    } catch (error) {
      console.error("Error extracting links:", error);
      return [];
    }
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
      
      while (urlQueue.length > 0 && processedUrls.size < maxPages) {
        const { url: currentUrl, depth } = urlQueue.shift()!;
        
        if (processedUrls.has(currentUrl)) continue;
        processedUrls.add(currentUrl);
        
        console.log(`Fetching ${currentUrl} (depth: ${depth})`);
        
        try {
          // Fetch and process page
          const response = await axios.get(currentUrl);
          const html = response.data;
          
          // Extract content using Readability.js (much better content extraction)
          const extractedContent = this.extractContentWithReadability(html, currentUrl);
          
          if (!extractedContent.success || !extractedContent.textContent || extractedContent.textContent.trim().length === 0) {
            continue;
          }
          
          // Create docs from text chunks
          const docs = await this.textSplitter.createDocuments([extractedContent.textContent], [{ 
            source: currentUrl,
            title: extractedContent.title,
            url: currentUrl,
            siteName: extractedContent.siteName,
            author: extractedContent.author,
            crawlTime: new Date().toISOString()
          }]);
          
          // Add documents to vector store
          if (docs.length > 0) {
            // Ensure all docs have content
            const validDocs = docs.map(doc => {
              if (!doc.pageContent || doc.pageContent.trim().length === 0) {
                doc.pageContent = "This document contains no extractable text content.";
              }
              return doc;
            });

            await collection.addDocuments(validDocs);
            addedChunks += validDocs.length;
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
      if (!query || query.trim().length === 0) {
        throw new Error("Search query cannot be empty");
      }
      
      // Get the collection, loading it if necessary
      const collection = await this.getCollection(collectionName);
      
      // Check if the collection has documents
      const vectorsData = (collection as any).memoryVectors;
      if (!vectorsData || !Array.isArray(vectorsData) || vectorsData.length === 0) {
        return [];
      }
      
      // Perform the search
      const results = await collection.similaritySearch(query, k);
      
      // Ensure results have valid content
      const validResults = results.map(doc => {
        // Clone the document to avoid modifying the original
        const newDoc = new Document({
          pageContent: doc.pageContent && doc.pageContent.trim() !== "" 
            ? doc.pageContent 
            : "This document contains no extractable text content.",
          metadata: {
            ...doc.metadata,
            title: doc.metadata?.title || doc.metadata?.source?.split("/").pop() || "Untitled"
          }
        });
        return newDoc;
      });
      
      return validResults;
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
      let collectionsFromMetadata: string[] = [];
      let collectionsFromFiles: string[] = [];
      
      // Get collections from metadata file if it exists
      if (fs.existsSync(collectionsPath)) {
        try {
          const collectionsData = JSON.parse(fs.readFileSync(collectionsPath, "utf-8"));
          collectionsFromMetadata = Object.keys(collectionsData);
        } catch (error) {
          console.error("Error parsing collections metadata:", error);
        }
      }
      
      // Also scan the directory for any .json files that might be collections
      if (fs.existsSync(this.dataDir)) {
        try {
          const files = fs.readdirSync(this.dataDir);
          collectionsFromFiles = files
            .filter(file => file.endsWith('.json') && file !== 'collections.json')
            .map(file => file.replace('.json', ''));
        } catch (error) {
          console.error("Error scanning collections directory:", error);
        }
      }
      
      // Combine both sources of collection names
      const allCollections = [...new Set([...collectionsFromMetadata, ...collectionsFromFiles])];
      
      // Verify each collection has a file and filter out invalid ones
      const validCollections = allCollections.filter(name => {
        const collectionPath = path.join(this.dataDir, `${name}.json`);
        return fs.existsSync(collectionPath);
      });
      
      // Update metadata if we found collections not in the metadata
      if (validCollections.length > collectionsFromMetadata.length) {
        const newCollections = validCollections.filter(name => !collectionsFromMetadata.includes(name));
        if (newCollections.length > 0) {
          for (const name of newCollections) {
            // This will load the collection and update metadata
            await this.getCollection(name);
          }
        }
      }
      
      return validCollections;
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
        return 0;
      }
      
      const collection = await this.getCollection(collectionName);
      
      // Create docs from text chunks
      const docs = await this.textSplitter.createDocuments([text], [{
        ...metadata
      }]);
      
      // Ensure all docs have content
      const validDocs = docs.map(doc => {
        if (!doc.pageContent || doc.pageContent === "No content") {
          doc.pageContent = text.substring(0, Math.min(text.length, 500));
        }
        return doc;
      });
      
      // Add documents to vector store
      if (validDocs.length > 0) {
        await collection.addDocuments(validDocs);
        
        // Save the collection
        await this.saveCollection(collectionName);
        
        return validDocs.length;
      }
      
      return 0;
    } catch (error) {
      console.error(`Error adding text to collection ${collectionName}:`, error);
      return 0;
    }
  }
} 