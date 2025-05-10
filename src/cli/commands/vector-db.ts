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
      console.log(`Crawl: ${options.crawl ? 'Enabled' : 'Disabled'}`);
      
      if (options.crawl) {
        console.log(`Max pages: ${options.maxPages}, Max depth: ${options.maxDepth}`);
      }
      
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
      
      console.log(`Adding file ${resolvedPath} to collection '${options.name}'...`);
      
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
    .action(async (query: string, options: any) => {
      const db = new VectorDB();
      
      console.log(`Searching for "${query}" in collection '${options.name}'...`);
      
      try {
        const results = await db.search(options.name, query, parseInt(options.k));
        
        if (results.length === 0) {
          console.log(`No results found in collection '${options.name}'`);
          return;
        }
        
        console.log(`Found ${results.length} results:`);
        
        results.forEach((doc, i) => {
          const source = doc.metadata?.source || 'Unknown source';
          console.log(`\n${i + 1}. ${renderMarkdown('**Source:** ' + source)}`);
          console.log(renderMarkdown(doc.pageContent));
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
  
  // Vector DB rebuild command (for debugging)
  cli
    .command('vdb-rebuild', 'Rebuild the vector database completely')
    .action(async () => {
      const db = new VectorDB();
      
      try {
        console.log('Rebuilding vector database...');
        
        // Delete the .vector-db directory
        const dataDir = path.join(process.cwd(), ".vector-db");
        if (fs.existsSync(dataDir)) {
          console.log(`Deleting directory: ${dataDir}`);
          fs.rmSync(dataDir, { recursive: true, force: true });
          console.log('Directory deleted successfully');
        }
        
        // Create a fresh directory
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('Created fresh directory');
        
        // Add a test document
        const testCollection = 'rebuild-test';
        console.log(`Adding test document to collection: ${testCollection}`);
        
        const testText = `
Smart contracts are programs which govern the behaviour of accounts within the Ethereum state.

Smart contracts are collections of code (its functions) and data (its state) that reside at a specific 
address on the Ethereum blockchain. Smart contracts are a type of Ethereum account. This means they 
have a balance and can be the target of transactions. However, they're not controlled by a user, 
instead they are deployed to the network and run as programmed. User accounts can then interact 
with a smart contract by submitting transactions that execute a function defined on the smart contract. 
Smart contracts can define rules, like a regular contract, and automatically enforce them via the code.
`;
        
        // Use the document directly without the file system
        const docs = await db.addText(testCollection, testText, {
          source: 'rebuild-test',
          title: 'Smart Contract Definition',
        });
        
        console.log(`✅ Added ${docs} document chunks to test collection`);
        console.log('Vector database has been successfully rebuilt');
        
        // List the collections
        const collections = await db.listCollections();
        console.log(`Collections available: ${collections.join(', ')}`);
      } catch (error: any) {
        console.error(`Error rebuilding database: ${error.message || String(error)}`);
      }
    });
} 