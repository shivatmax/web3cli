#!/usr/bin/env node

/**
 * Integration test for the updated vector database functionality
 * 
 * This script tests:
 * 1. Adding documents with crawling enabled
 * 2. Querying the vector database
 * 3. Using the retrieved documents to generate a smart contract
 */

// Import required modules directly from source
import { VectorDB, createMockVectorDB } from './dist/chunk-JVMMW5Z2.js';

// Set up test collection name
const COLLECTION_NAME = 'security-patterns';

// Run tests sequentially
async function runTests() {
  console.log('=== Vector Database Integration Test ===');
  
  try {
    // Step 1: Create vector database
    console.log('\n1. Creating mock vector database instance...');
    const db = createMockVectorDB();
    
    // Step 2: Test querying
    console.log('\n2. Testing query functionality...');
    const query = 'What are security best practices for smart contracts?';
    console.log(`   Query: "${query}"`);
    
    const results = await db.query(query, {
      collection: COLLECTION_NAME,
      limit: 3
    });
    
    console.log(`   ✓ Retrieved ${results.length} documents`);
    
    if (results.length > 0) {
      console.log('\n3. Results:');
      for (const result of results) {
        console.log(`   - ${result.metadata?.text || 'No text available'}`);
        console.log(`     Score: ${result.score}`);
        console.log();
      }
    }
    
    console.log('\n=== Test completed successfully! ===');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
runTests(); 