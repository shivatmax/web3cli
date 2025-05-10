/**
 * Vector Database Commands
 * 
 * This module implements commands for working with the vector database,
 * including adding documents, searching, and managing collections.
 */
import { cac, Command as CliCommand } from 'cac';
import path from 'path';
import fs from 'fs';
import { VectorDB } from '../../services/vector-db/vector-db';
import { renderMarkdown } from '../../utils/markdown';
import { Document } from '@langchain/core/documents';

/**
 * Register vector database commands with the CLI
 * 
 * @param cli The CLI command instance
 * @returns The configured command
 */
export function registerVectorDBCommands(cli: any): void {
  // Vector DB add-docs command
  cli
    .command('vdb-add-docs <url>', 'Add documents from a URL to the vector database')
    .option('-n, --name [name]', 'Collection name', { default: 'default' })
    .option('--crawl', 'Recursively crawl the website')
    .option('--max-pages [number]', 'Maximum number of pages to crawl', { default: 30 })
    .option('--max-depth [number]', 'Maximum crawl depth', { default: 3 })
    .action(async (url: string, options: any) => {
      const db = new VectorDB();
      
      console.log(`Adding documents from ${url} to collection '${options.name}'...`);
      
      try {
        const addedChunks = await db.addDocs(options.name, url, {
          crawl: options.crawl,
          maxPages: parseInt(options.maxPages),
          maxDepth: parseInt(options.maxDepth)
        });
        
        console.log(`✅ Added ${addedChunks} document chunks to collection '${options.name}'`);
      } catch (error: any) {
        console.error(`Error adding documents: ${error.message || String(error)}`);
      }
    });
  
  // Vector DB add-file command
  cli
    .command('vdb-add-file <file>', 'Add a file to the vector database')
    .option('-n, --name [name]', 'Collection name', { default: 'default' })
    .option('-t, --title [title]', 'Document title')
    .action(async (filePath: string, options: any) => {
      const db = new VectorDB();
      
      // Resolve absolute path
      const resolvedPath = path.resolve(process.cwd(), filePath);
      
      if (!fs.existsSync(resolvedPath)) {
        console.error(`File not found: ${resolvedPath}`);
        return;
      }
      
      console.log(`Adding file to collection '${options.name}'...`);
      
      try {
        const metadata = {
          title: options.title || path.basename(resolvedPath),
          type: 'file',
          extension: path.extname(resolvedPath)
        };
        
        const addedChunks = await db.addFile(options.name, resolvedPath, metadata);
        
        console.log(`✅ Added ${addedChunks} document chunks to collection '${options.name}'`);
      } catch (error: any) {
        console.error(`Error adding file: ${error.message || String(error)}`);
      }
    });
  
  // Vector DB search command
  cli
    .command('vdb-search <query>', 'Search the vector database')
    .option('-n, --name [name]', 'Collection name', { default: 'default' })
    .option('-k [number]', 'Number of results to return', { default: 5 })
    .option('--full-content', 'Show full content in results', { default: false })
    .action(async (query: string, options: any) => {
      const db = new VectorDB();
      
      console.log(`Searching in collection '${options.name}'...`);
      
      try {
        const results = await db.search(options.name, query, parseInt(options.k));
        
        if (results.length === 0) {
          console.log(`No results found in collection '${options.name}'`);
          return;
        }
        
        console.log(`Found ${results.length} results:`);
        
        results.forEach((doc, i) => {
          const source = doc.metadata?.source || 'Unknown source';
          const title = doc.metadata?.title || '';
          
          // Format the source/title display
          console.log(`\n${i + 1}. ${renderMarkdown('**Source:**')} ${source}`);
          
          if (title && title !== source) {
            console.log(`   ${renderMarkdown('**Title:**')} ${title}`);
          }
          
          // Additional metadata if available
          if (doc.metadata?.url && doc.metadata.url !== source) {
            console.log(`   ${renderMarkdown('**URL:**')} ${doc.metadata.url}`);
          }
          
          if (doc.metadata?.crawlTime) {
            const crawlDate = new Date(doc.metadata.crawlTime);
            console.log(`   ${renderMarkdown('**Indexed:**')} ${crawlDate.toLocaleString()}`);
          }
          
          // Display content with proper formatting
          console.log(renderMarkdown('---'));
          
          const hasValidContent = doc.pageContent && 
                                 doc.pageContent.trim() !== '' && 
                                 !doc.pageContent.includes('This document contains no extractable text content') &&
                                 !doc.pageContent.includes('No content could be extracted from this page');
          
          if (!hasValidContent) {
            console.log(renderMarkdown('*No content available*'));
          } else {
            // Normalize line breaks and whitespace
            let contentText = doc.pageContent
              .replace(/\r\n/g, '\n')
              .replace(/\n{3,}/g, '\n\n')
              .trim();
            
            // Limit content length for better readability unless full content is requested
            const contentPreview = options.fullContent 
              ? contentText
              : contentText.length > 800 
                ? contentText.substring(0, 800) + "..."
                : contentText;
              
            console.log(renderMarkdown(contentPreview));
          }
          
          console.log('-'.repeat(80));
        });
      } catch (error: any) {
        console.error(`Error searching: ${error.message || String(error)}`);
      }
    });
  
  // Vector DB list collections command
  cli
    .command('vdb-list', 'List all collections in the vector database')
    .action(async () => {
      const db = new VectorDB();
      
      try {
        const collections = await db.listCollections();
        
        if (collections.length === 0) {
          console.log('No collections found');
          return;
        }
        
        console.log(`Found ${collections.length} collections:`);
        
        collections.forEach((name, i) => {
          console.log(`${i + 1}. ${name}`);
        });
      } catch (error: any) {
        console.error(`Error listing collections: ${error.message || String(error)}`);
      }
    });
  
  // Vector DB fix collections command
  cli
    .command('vdb-fix', 'Fix and synchronize all collections in the vector database')
    .action(async () => {
      try {
        console.log('Initializing vector database repair...');
        
        // Get the data directory path
        const dataDir = path.join(process.cwd(), ".vector-db");
        if (!fs.existsSync(dataDir)) {
          console.log('No vector database directory found. Nothing to fix.');
          return;
        }
        
        console.log(`Database directory found at: ${dataDir}`);
        
        // Scan for all collection files
        console.log('Scanning for collection files...');
        const files = fs.readdirSync(dataDir);
        
        console.log(`Found ${files.length} files in the database directory: ${files.join(', ')}`);
        
        const collectionFiles = files
          .filter(file => file.endsWith('.json') && file !== 'collections.json')
          .map(file => file.replace('.json', ''));
        
        if (collectionFiles.length === 0) {
          console.log('No collection files found. Nothing to fix.');
          return;
        }
        
        console.log(`Found ${collectionFiles.length} potential collections to repair: ${collectionFiles.join(', ')}`);
        
        // Create a fresh instance of the vector DB
        console.log('Creating vector database instance...');
        const db = new VectorDB();
        
        // Read current collections metadata
        const collectionsPath = path.join(dataDir, "collections.json");
        let currentMetadata: string[] = [];
        
        if (fs.existsSync(collectionsPath)) {
          try {
            const metadataRaw = fs.readFileSync(collectionsPath, 'utf-8');
            const metadata = JSON.parse(metadataRaw);
            currentMetadata = Object.keys(metadata);
            console.log(`Current collections in metadata: ${currentMetadata.join(', ')}`);
          } catch (error) {
            console.warn('Error reading collections metadata file:', error);
          }
        } else {
          console.log('No collections metadata file found.');
        }
        
        // Find collections that need to be added to metadata
        const missingCollections = collectionFiles.filter(name => !currentMetadata.includes(name));
        if (missingCollections.length > 0) {
          console.log(`Found ${missingCollections.length} collections missing from metadata: ${missingCollections.join(', ')}`);
        } else {
          console.log('All collection files are present in metadata.');
        }
        
        // Load each collection to ensure it's registered
        let processed = 0;
        for (const name of collectionFiles) {
          console.log(`Processing collection: ${name}`);
          await db.getCollection(name);
          processed++;
        }
        
        // List collections after repair
        const collections = await db.listCollections();
        console.log(`\n✅ Repair complete. Processed ${processed} collections.`);
        console.log(`Collections available: ${collections.join(', ')}`);
        
      } catch (error: any) {
        console.error(`Error fixing collections: ${error.message || String(error)}`);
      }
    });
  
  // Vector DB add-text command
  cli
    .command('vdb-add-text <text>', 'Add text directly to the vector database')
    .option('-n, --name [name]', 'Collection name', { default: 'default' })
    .option('-t, --title [title]', 'Document title')
    .option('-s, --source [source]', 'Source identifier')
    .action(async (text: string, options: any) => {
      const db = new VectorDB();
      
      console.log(`Adding text to collection '${options.name}'...`);
      
      try {
        const metadata = {
          title: options.title || 'Text Document',
          source: options.source || 'User Input',
          type: 'text',
          timestamp: new Date().toISOString()
        };
        
        const addedChunks = await db.addText(options.name, text, metadata);
        
        console.log(`✅ Added ${addedChunks} document chunks to collection '${options.name}'`);
      } catch (error: any) {
        console.error(`Error adding text: ${error.message || String(error)}`);
      }
    });
  
  // Vector DB rebuild command (for debugging)
  cli
    .command('vdb-rebuild', 'Rebuild the vector database completely')
    .option('--clean', 'Delete all existing collections', { default: false })
    .action(async (options: any) => {
      const db = new VectorDB();
      
      try {
        console.log('Rebuilding vector database...');
        
        // Get the data directory path
        const dataDir = path.join(process.cwd(), ".vector-db");
        
        // Option to remove all existing collections
        const cleanRebuild = options.clean === true;
        
        if (cleanRebuild) {
          console.log('Clean rebuild requested - removing all existing collections...');
          
          if (fs.existsSync(dataDir)) {
            fs.rmSync(dataDir, { recursive: true, force: true });
          }
          
          // Create a fresh directory
          fs.mkdirSync(dataDir, { recursive: true });
        } else {
          console.log('Preserving existing collections...');
          
          // Ensure the directory exists
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }
        }
        
        // Add a test document
        const testCollection = 'rebuild-test';
        
        const testText = `
# Smart Contracts

Smart contracts are programs which govern the behaviour of accounts within the Ethereum state.

## Definition

Smart contracts are collections of code (its functions) and data (its state) that reside at a specific 
address on the Ethereum blockchain. Smart contracts are a type of Ethereum account. This means they 
have a balance and can be the target of transactions. However, they're not controlled by a user, 
instead they are deployed to the network and run as programmed. User accounts can then interact 
with a smart contract by submitting transactions that execute a function defined on the smart contract. 
Smart contracts can define rules, like a regular contract, and automatically enforce them via the code.

## Key Features

1. **Immutable**: Once deployed, the code of a smart contract cannot be changed.
2. **Deterministic**: The same input will always produce the same output.
3. **Trustless**: No need to trust a third party, as the contract enforces its own rules.
4. **Transparent**: All transactions on the blockchain are publicly visible.
`;
        
        // Read existing collections.json if it exists and we're preserving collections
        let collectionsData: Record<string, any> = {};
        const collectionsPath = path.join(dataDir, "collections.json");
        
        if (!cleanRebuild && fs.existsSync(collectionsPath)) {
          try {
            const existingData = fs.readFileSync(collectionsPath, "utf-8");
            collectionsData = JSON.parse(existingData);
            console.log(`Found existing collections: ${Object.keys(collectionsData).join(', ')}`);
          } catch (error) {
            console.warn('Could not read existing collections data, starting fresh.');
          }
        }
        
        // Add the test collection to the metadata
        collectionsData[testCollection] = { 
          name: testCollection, 
          timestamp: new Date().toISOString() 
        };
        
        // Save collections metadata
        fs.writeFileSync(
          collectionsPath,
          JSON.stringify(collectionsData, null, 2)
        );
        
        // Create document file for test collection
        const documents = [
          {
            pageContent: testText,
            metadata: {
              source: 'rebuild-test',
              title: 'Smart Contract Definition'
            }
          }
        ];
        
        // Save document directly
        fs.writeFileSync(
          path.join(dataDir, `${testCollection}.json`),
          JSON.stringify(documents, null, 2)
        );
        
        console.log(`✅ Added document to test collection`);
        console.log('Vector database has been successfully rebuilt');
        
        // Let the vector DB service discover and load all collections
        const vectorDB = new VectorDB();
        const collections = await vectorDB.listCollections();
        
        console.log(`Collections available: ${collections.join(', ')}`);
      } catch (error: any) {
        console.error(`Error rebuilding database: ${error.message || String(error)}`);
      }
    });
} 