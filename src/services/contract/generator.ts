/**
 * Smart Contract Generator Service
 * 
 * This module provides functionality for generating smart contracts from
 * natural language descriptions.
 */
import fs from 'node:fs';
import path from 'node:path';
import { getAIClient } from '../ai/client';
import { getSearchResults } from '../search/search';
import { VectorDB } from '../vector-db/vector-db';

/**
 * Options for contract generation
 */
export interface GenerateOptions {
  model?: string;
  stream?: boolean;
  files?: string;
  url?: string;
  search?: boolean;
  readDocs?: string;
  output?: string;
  hardhat?: boolean;
  pipeInput?: string;
}

/**
 * Generate a smart contract from natural language
 * 
 * @param prompt The natural language description
 * @param options Generation options
 * @returns Generated contract code and security notes
 */
export async function generateContract(
  prompt: string,
  options: GenerateOptions
): Promise<{ code: string; securityNotes: string; testCode?: string }> {
  console.log(`Generating smart contract for: ${prompt}`);
  
  // Gather context from various sources
  let context = '';
  
  // Add file context
  if (options.files) {
    context += await getFileContext(options.files);
  }
  
  // Add URL context
  if (options.url) {
    context += await getUrlContext(options.url);
  }
  
  // Add search context
  if (options.search) {
    context += await getSearchContext(prompt);
  }
  
  // Add vector database context
  if (options.readDocs) {
    context += await getVectorDBContext(options.readDocs, prompt);
  }
  
  // Add pipe input if available
  if (options.pipeInput) {
    context += `\nPipe Input:\n${options.pipeInput}`;
  }
  
  // Get AI client
  const ai = getAIClient(options.model);
  
  // Build system prompt
  const systemPrompt = buildSystemPrompt(prompt, context, options.hardhat);
  
  // Generate contract
  const result = await ai.generate(systemPrompt, {
    stream: options.stream !== false,
  });
  
  // Parse the response
  const { code, securityNotes, testCode } = parseResponse(result.text);
  
  // Save the contract to a file if requested
  if (options.output && code) {
    // Create the output directory if it doesn't exist
    const outputDir = path.dirname(options.output);
    fs.mkdirSync(outputDir, { recursive: true });
    
    fs.writeFileSync(options.output, code);
    console.log(`✅ Contract saved to ${options.output}`);
    
    // If Hardhat tests were requested and generated, save them too
    if (options.hardhat && testCode) {
      const testFilePath = path.join(
        path.dirname(options.output),
        `${path.basename(options.output, '.sol')}.test.js`
      );
      fs.writeFileSync(testFilePath, testCode);
      console.log(`✅ Test file saved to ${testFilePath}`);
    }
  }
  
  return {
    code,
    securityNotes,
    testCode,
  };
}

/**
 * Build system prompt for contract generation
 */
function buildSystemPrompt(
  prompt: string, 
  context: string, 
  generateTests: boolean = false
): string {
  return `You are an expert Solidity developer specializing in secure smart contract development.
Generate a secure, well-documented smart contract based on the following requirements:

${prompt}

${context ? `Additional context:\n${context}\n` : ''}

Follow these guidelines:
1. Use Solidity version 0.8.20 or higher
2. Follow security best practices
3. Use OpenZeppelin contracts for standard functionality
4. Include comprehensive NatSpec documentation
5. Include appropriate access control measures
6. Implement proper input validation
7. Use events for state changes
8. Protect against common vulnerabilities
${generateTests ? '9. Include Hardhat test cases to verify the contract functionality' : ''}

Respond with:
1. The complete Solidity contract code
2. Security considerations and notes
${generateTests ? '3. Hardhat test code' : ''}`;
}

/**
 * Parse the AI response to extract code, security notes, and test code
 */
function parseResponse(response: string): { 
  code: string; 
  securityNotes: string; 
  testCode?: string 
} {
  // This is a simplified implementation
  // A real implementation would use regex or parsing to extract sections
  const sections = response.split('## ');
  
  let code = '';
  let securityNotes = '';
  let testCode = undefined;
  
  for (const section of sections) {
    if (section.startsWith('Solidity Contract') || section.startsWith('Contract Code')) {
      code = extractCode(section);
    } else if (section.startsWith('Security Considerations')) {
      securityNotes = section.replace('Security Considerations', '').trim();
    } else if (section.startsWith('Test Code') || section.startsWith('Hardhat Tests')) {
      testCode = extractCode(section);
    }
  }
  
  return {
    code,
    securityNotes,
    testCode,
  };
}

/**
 * Extract code from a section
 */
function extractCode(section: string): string {
  const codeMatch = section.match(/```solidity\n([\s\S]*?)\n```/) || 
                   section.match(/```javascript\n([\s\S]*?)\n```/) ||
                   section.match(/```\n([\s\S]*?)\n```/);
  return codeMatch ? codeMatch[1].trim() : '';
}

/**
 * Get context from files
 */
async function getFileContext(filesPattern: string): Promise<string> {
  // Implementation to read files matching the pattern
  return '';
}

/**
 * Get context from URLs
 */
async function getUrlContext(url: string): Promise<string> {
  // Implementation to fetch content from URLs
  return '';
}

/**
 * Get context from web search
 */
async function getSearchContext(query: string): Promise<string> {
  const results = await getSearchResults(`solidity ${query} best practices`);
  return `Search Results:\n${results}`;
}

/**
 * Get context from vector database
 */
async function getVectorDBContext(collection: string, query: string): Promise<string> {
  const vectorDB = new VectorDB();
  const docs = await vectorDB.similaritySearch(collection, query, 5);
  return `VectorDB Results:\n${docs.map(d => d.pageContent || '').join('\n\n')}`;
} 