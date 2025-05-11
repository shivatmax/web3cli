/**
 * Contract Commands
 * 
 * This module provides commands for working with smart contracts,
 * including explanation, audit, and custom requests.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { getSDKModel } from '../ai/ai-sdk.js';
import { loadConfig } from '../config/config.js';
import { fetchContractSource, saveContractData } from './contract-utils.js';
import { renderMarkdown } from '../../utils/markdown.js';
import logUpdate from 'log-update';
import { ethers } from 'ethers';

/**
 * Options for contract commands
 */
export interface ContractCommandOptions {
  model?: string;
  network?: string;
  output?: string;
  stream?: boolean;
  readDocs?: string;
}

/**
 * Explain a smart contract
 * 
 * @param source Contract address or file path
 * @param options Command options
 * @returns Explanation text
 */
export async function explainContract(
  source: string,
  options: ContractCommandOptions = {}
): Promise<string> {
  console.log(`Analyzing contract from: ${source}`);
  
  // Determine if input is an address or file path
  const isAddress = ethers.isAddress(source);
  
  // Get contract source code
  let contractCode: string;
  let contractName: string = 'Unknown';
  let contractAbi: any = null;
  
  if (isAddress) {
    console.log(`Fetching contract source from ${options.network || 'sepolia'} network...`);
    const contractData = await fetchContractSource(source, options.network);
    
    contractCode = contractData.sourceCode;
    contractName = contractData.contractName;
    contractAbi = contractData.abi;
    
    // Save contract data if output option is provided
    if (options.output) {
      const outputDir = path.join(process.cwd(), 'output', source);
      // Create output directory
      fs.mkdirSync(outputDir, { recursive: true });
      
      const outputPath = path.join(outputDir, `${contractName}.sol`);
      
      const savedPaths = saveContractData(outputPath, contractData, source);
      console.log(`✅ Contract source saved to ${savedPaths.sourcePath}`);
      console.log(`✅ Contract ABI saved to ${savedPaths.abiPath}`);
      console.log(`✅ Contract info saved to ${savedPaths.infoPath}`);
    }
  } else {
    // Read from file
    if (!fs.existsSync(source)) {
      throw new Error(`File not found: ${source}`);
    }
    
    contractCode = fs.readFileSync(source, 'utf-8');
    contractName = path.basename(source, path.extname(source));
  }
  
  // Get explanation of the contract using AI
  const config = loadConfig();
  const modelId = options.model || config.default_model || 'gpt-4o-mini';
  const openai = await getSDKModel(modelId, config);
  
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are a highly knowledgeable blockchain expert specializing in smart contract analysis. 
      
Your task is to provide a comprehensive explanation of a smart contract including:

1. Contract purpose and main functionality
2. Key functions and how they work
3. Permission structure and access control
4. Security patterns implemented
5. Potential risks or vulnerabilities
6. Gas efficiency considerations
7. Integration points with other contracts

Be thorough yet concise. Focus on technical aspects that would be most relevant to developers and auditors.
`
    },
    {
      role: 'user',
      content: `Analyze the following smart contract "${contractName}":\n\n${contractCode}`
    }
  ];
  
  // Generate explanation
  let explanation = '';
  
  if (options.stream !== false) {
    console.log(`Generating explanation using ${modelId}...`);
    try {
      const stream = await openai.chat.completions.create({
        model: modelId,
        messages,
        stream: true,
      });
  
      for await (const chunk of stream as any) {
        const content_chunk = chunk.choices?.[0]?.delta?.content || '';
        explanation += content_chunk;
        logUpdate(renderMarkdown(explanation));
      }
      logUpdate.done();
    } catch (error) {
      console.error(`Error generating streaming explanation: ${error}`);
      // Fall back to non-streaming if streaming fails
      const completion = await openai.chat.completions.create({
        model: modelId,
        messages,
      });
      explanation = completion.choices?.[0]?.message?.content || '';
      console.log(renderMarkdown(explanation));
    }
  } else {
    console.log(`Generating explanation using ${modelId}...`);
    const completion = await openai.chat.completions.create({
      model: modelId,
      messages,
    });
    explanation = completion.choices?.[0]?.message?.content || '';
    console.log(renderMarkdown(explanation));
  }
  
  // Save explanation if output option is provided
  if (options.output) {
    let outputDir: string;
    let outputFilename: string;
    
    if (isAddress) {
      outputDir = path.join(process.cwd(), 'output', source);
      outputFilename = `${contractName}.explanation.md`;
    } else {
      outputDir = path.join(process.cwd(), 'output', path.dirname(source));
      outputFilename = `${path.basename(source, path.extname(source))}.explanation.md`;
    }
    
    // Create the output directory if it doesn't exist
    fs.mkdirSync(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, outputFilename);
    fs.writeFileSync(outputPath, explanation);
    console.log(`\n✅ Explanation saved to ${outputPath}`);
  }
  
  return explanation;
}

/**
 * Audit a smart contract
 * 
 * @param source Contract address or file path
 * @param options Command options
 * @returns Audit text
 */
export async function auditContract(
  source: string,
  options: ContractCommandOptions = {}
): Promise<string> {
  console.log(`Auditing contract from: ${source}`);
  
  // Determine if input is an address or file path
  const isAddress = ethers.isAddress(source);
  
  // Get contract source code
  let contractCode: string;
  let contractName: string = 'Unknown';
  
  if (isAddress) {
    console.log(`Fetching contract source from ${options.network || 'sepolia'} network...`);
    const contractData = await fetchContractSource(source, options.network);
    
    contractCode = contractData.sourceCode;
    contractName = contractData.contractName;
    
    // Save contract data if output option is provided
    if (options.output) {
      const outputDir = path.join(process.cwd(), 'output', source);
      // Create output directory
      fs.mkdirSync(outputDir, { recursive: true });
      
      const outputPath = path.join(outputDir, `${contractName}.sol`);
      
      const savedPaths = saveContractData(outputPath, contractData, source);
      console.log(`✅ Contract source saved to ${savedPaths.sourcePath}`);
      console.log(`✅ Contract ABI saved to ${savedPaths.abiPath}`);
      console.log(`✅ Contract info saved to ${savedPaths.infoPath}`);
    }
  } else {
    // Read from file
    if (!fs.existsSync(source)) {
      throw new Error(`File not found: ${source}`);
    }
    
    contractCode = fs.readFileSync(source, 'utf-8');
    contractName = path.basename(source, path.extname(source));
  }
  
  // Get audit of the contract using AI
  const config = loadConfig();
  const modelId = options.model || config.default_model || 'gpt-4o-mini';
  const openai = await getSDKModel(modelId, config);
  
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are a highly skilled smart contract auditor specializing in identifying security vulnerabilities and code issues.
      
Perform a comprehensive security audit of the provided smart contract including:

1. Critical vulnerabilities (e.g., reentrancy, overflow/underflow, front-running)
2. Access control issues
3. Logic vulnerabilities
4. Gas optimization opportunities
5. Code quality and best practices
6. Compliance with ERC standards (if applicable)

For each finding:
- Assign a severity (Critical, High, Medium, Low, Informational)
- Provide a clear description of the issue
- Explain the potential impact
- Offer concrete recommendations for remediation

Be thorough and focus on actionable insights that would help developers improve security.
`
    },
    {
      role: 'user',
      content: `Audit the following smart contract "${contractName}":\n\n${contractCode}`
    }
  ];
  
  // Generate audit
  let audit = '';
  
  if (options.stream !== false) {
    console.log(`Generating audit using ${modelId}...`);
    try {
      const stream = await openai.chat.completions.create({
        model: modelId,
        messages,
        stream: true,
      });
  
      for await (const chunk of stream as any) {
        const content_chunk = chunk.choices?.[0]?.delta?.content || '';
        audit += content_chunk;
        logUpdate(renderMarkdown(audit));
      }
      logUpdate.done();
    } catch (error) {
      console.error(`Error generating streaming audit: ${error}`);
      // Fall back to non-streaming if streaming fails
      const completion = await openai.chat.completions.create({
        model: modelId,
        messages,
      });
      audit = completion.choices?.[0]?.message?.content || '';
      console.log(renderMarkdown(audit));
    }
  } else {
    console.log(`Generating audit using ${modelId}...`);
    const completion = await openai.chat.completions.create({
      model: modelId,
      messages,
    });
    audit = completion.choices?.[0]?.message?.content || '';
    console.log(renderMarkdown(audit));
  }
  
  // Save audit if output option is provided
  if (options.output) {
    let outputDir: string;
    let outputFilename: string;
    
    if (isAddress) {
      outputDir = path.join(process.cwd(), 'output', source);
      outputFilename = `${contractName}.audit.md`;
    } else {
      outputDir = path.join(process.cwd(), 'output', path.dirname(source));
      outputFilename = `${path.basename(source, path.extname(source))}.audit.md`;
    }
    
    // Create the output directory if it doesn't exist
    fs.mkdirSync(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, outputFilename);
    fs.writeFileSync(outputPath, audit);
    console.log(`\n✅ Audit saved to ${outputPath}`);
  }
  
  return audit;
}

/**
 * Custom contract request
 * 
 * @param source Contract address or file path
 * @param query Custom query to ask about the contract
 * @param options Command options
 * @returns Response text
 */
export async function customContractRequest(
  source: string,
  query: string,
  options: ContractCommandOptions = {}
): Promise<string> {
  console.log(`Analyzing contract from: ${source} with custom query: "${query}"`);
  
  // Determine if input is an address or file path
  const isAddress = ethers.isAddress(source);
  
  // Get contract source code
  let contractCode: string;
  let contractName: string = 'Unknown';
  
  if (isAddress) {
    console.log(`Fetching contract source from ${options.network || 'sepolia'} network...`);
    const contractData = await fetchContractSource(source, options.network);
    
    contractCode = contractData.sourceCode;
    contractName = contractData.contractName;
    
    // Save contract data if output option is provided
    if (options.output) {
      const outputDir = path.join(process.cwd(), 'output', source);
      // Create output directory
      fs.mkdirSync(outputDir, { recursive: true });
      
      const outputPath = path.join(outputDir, `${contractName}.sol`);
      
      const savedPaths = saveContractData(outputPath, contractData, source);
      console.log(`✅ Contract source saved to ${savedPaths.sourcePath}`);
      console.log(`✅ Contract ABI saved to ${savedPaths.abiPath}`);
      console.log(`✅ Contract info saved to ${savedPaths.infoPath}`);
    }
  } else {
    // Read from file
    if (!fs.existsSync(source)) {
      throw new Error(`File not found: ${source}`);
    }
    
    contractCode = fs.readFileSync(source, 'utf-8');
    contractName = path.basename(source, path.extname(source));
  }
  
  // Process the custom query using AI
  const config = loadConfig();
  const modelId = options.model || config.default_model || 'gpt-4o-mini';
  const openai = await getSDKModel(modelId, config);
  
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are a highly knowledgeable blockchain expert specializing in smart contract analysis. 
      
You will be given a Solidity smart contract and a specific query about it. Focus your analysis on directly answering the query with technical accuracy and relevant details from the contract.
`
    },
    {
      role: 'user',
      content: `Smart contract "${contractName}":\n\n${contractCode}\n\nQuery: ${query}`
    }
  ];
  
  // Generate response
  let response = '';
  
  if (options.stream !== false) {
    console.log(`Generating response using ${modelId}...`);
    try {
      const stream = await openai.chat.completions.create({
        model: modelId,
        messages,
        stream: true,
      });
  
      for await (const chunk of stream as any) {
        const content_chunk = chunk.choices?.[0]?.delta?.content || '';
        response += content_chunk;
        logUpdate(renderMarkdown(response));
      }
      logUpdate.done();
    } catch (error) {
      console.error(`Error generating streaming response: ${error}`);
      // Fall back to non-streaming if streaming fails
      const completion = await openai.chat.completions.create({
        model: modelId,
        messages,
      });
      response = completion.choices?.[0]?.message?.content || '';
      console.log(renderMarkdown(response));
    }
  } else {
    console.log(`Generating response using ${modelId}...`);
    const completion = await openai.chat.completions.create({
      model: modelId,
      messages,
    });
    response = completion.choices?.[0]?.message?.content || '';
    console.log(renderMarkdown(response));
  }
  
  // Save response if output option is provided
  if (options.output) {
    let outputDir: string;
    let outputFilename: string;
    
    if (isAddress) {
      outputDir = path.join(process.cwd(), 'output', source);
      // Create a sanitized version of the query for the filename
      const sanitizedQuery = query.slice(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      outputFilename = `${contractName}.${sanitizedQuery}.md`;
    } else {
      outputDir = path.join(process.cwd(), 'output', path.dirname(source));
      const sanitizedQuery = query.slice(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      outputFilename = `${path.basename(source, path.extname(source))}.${sanitizedQuery}.md`;
    }
    
    // Create the output directory if it doesn't exist
    fs.mkdirSync(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, outputFilename);
    fs.writeFileSync(outputPath, response);
    console.log(`\n✅ Response saved to ${outputPath}`);
  }
  
  return response;
} 