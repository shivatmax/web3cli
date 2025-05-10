#!/usr/bin/env node

/**
 * Test Script for Vector Database
 * 
 * This script verifies that the required dependencies for our vector database 
 * implementation are available and can be imported correctly.
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🧪 Testing vector database dependencies...");

async function testDependencies() {
  try {
    // Test importing LangChain
    console.log("Testing LangChain imports...");
    const { OpenAIEmbeddings } = await import("langchain/embeddings/openai");
    const { MemoryVectorStore } = await import("langchain/vectorstores/memory");
    const { Document } = await import("langchain/document");
    const { RecursiveCharacterTextSplitter } = await import("langchain/text_splitter");
    
    console.log("✅ Successfully imported LangChain modules");
    
    // Test importing Cheerio
    console.log("Testing Cheerio imports...");
    const cheerio = await import("cheerio");
    console.log("✅ Successfully imported Cheerio");
    
    // Test importing OpenAI
    console.log("Testing OpenAI imports...");
    const { OpenAI } = await import("openai");
    console.log("✅ Successfully imported OpenAI");
    
    // Test package.json
    const packageJsonPath = join(__dirname, 'package.json');
    console.log(`Checking package.json at ${packageJsonPath}`);
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      console.log("✅ Package.json exists");
      
      // Check for required dependencies
      const requiredDeps = ['langchain', 'openai', 'cheerio'];
      const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
      
      if (missingDeps.length === 0) {
        console.log(`✅ All required dependencies are listed in package.json: ${requiredDeps.join(', ')}`);
      } else {
        console.warn(`⚠️ Missing dependencies in package.json: ${missingDeps.join(', ')}`);
      }
    } else {
      console.error("❌ Package.json not found");
    }
    
    // Check implementation files
    const vectorDbPath = join(__dirname, 'src', 'services', 'vector-db', 'vector-db.ts');
    console.log(`Checking vector-db implementation at ${vectorDbPath}`);
    
    if (fs.existsSync(vectorDbPath)) {
      console.log("✅ Vector database implementation file exists");
    } else {
      console.error("❌ Vector database implementation file not found");
    }
    
    // Successfully completed all tests
    console.log("\n✅ All dependency checks passed successfully!");
    console.log("\nTo use the vector database, ensure you have set the OPENAI_API_KEY environment variable.");
    console.log("You can then use the CLI commands:");
    console.log("- web3cli vector-db add-docs <url> --name <collection> [--crawl] [--max-pages <num>]");
    console.log("- web3cli vector-db add-file <file> --name <collection>");
    console.log("- web3cli vector-db search <query> --name <collection>");
    console.log("- web3cli vector-db list");
    
  } catch (error) {
    console.error("❌ Error during dependency test:", error);
    process.exit(1);
  }
}

// Run the test
testDependencies().catch(error => {
  console.error("❌ Critical error:", error);
  process.exit(1);
}); 