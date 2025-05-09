/**
 * Custom Contract Requests Service
 * 
 * This module provides functionality for handling custom requests
 * related to smart contracts such as code reviews, optimization suggestions,
 * gas analysis, or any other custom task.
 */
import fs from "node:fs";
import { getSDKModel } from "../ai/ai-sdk";
import { loadConfig } from "../config/config";
import { CliError } from "../../utils/error";
import logUpdate from "log-update";
import { renderMarkdown, stripMarkdownCodeBlocks } from "../../utils/markdown";
import { VectorDB } from "../vector-db/vector-db";
import { notEmpty } from "../../utils/common";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { fetchContractData, formatContractData } from "./contract-fetcher";
import { ethers } from "ethers";

/**
 * Process a custom request related to a smart contract
 * 
 * @param source Contract address or file path
 * @param request The custom request/query
 * @param options Request options
 * @returns Processing result
 */
export async function processContractRequest(
  source: string,
  request: string,
  options: {
    model?: string;
    network?: string;
    stream?: boolean;
    readDocs?: string;
    output?: string;
    web?: boolean;
  } = {}
): Promise<{
  response: string;
}> {
  if (!request) {
    throw new CliError("Please provide a request");
  }

  // Check if source is a file path or contract address
  const isFile = source.endsWith(".sol") || fs.existsSync(source);
  const isAddress = ethers.isAddress(source);
  
  console.log(`Processing request for ${isFile ? "contract file" : isAddress ? "deployed contract" : "contract source"}...`);
  
  // Load contract content
  let contractContent = "";
  if (isFile) {
    try {
      contractContent = fs.readFileSync(source, "utf8");
    } catch (error) {
      throw new CliError(`Failed to read contract file: ${error}`);
    }
  } else if (isAddress) {
    try {
      // Fetch contract data from the blockchain
      const contractData = await fetchContractData(source, options.network || "sepolia");
      contractContent = formatContractData(contractData);
    } catch (error) {
      throw new CliError(`Failed to fetch contract data: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    // Assume it's an inline contract source
    contractContent = source;
  }
  
  const config = loadConfig();
  const modelId = options.model || config.default_model || "gpt-4o-mini";
  const openai = await getSDKModel(modelId, config);
  
  // Handle vector DB docs
  let docsContext: string[] = [];
  if (options.readDocs) {
    try {
      const vdb = new VectorDB();
      // Use both contract content and request to find relevant docs
      const customQuery = `${request} ${contractContent.substring(0, 200)}`;
      const docs = await vdb.similaritySearch(options.readDocs, customQuery, 5);
      if (docs.length > 0) {
        docsContext = [
          `docs:${options.readDocs}:`,
          ...docs.map((d) => `"""
${d.text}
"""`),
        ];
      }
    } catch (e) {
      // ignore if vector db fails
      console.warn("Warning: Could not retrieve docs from vector DB:", e);
    }
  }
  
  // Add web search context if enabled
  let webContext = "";
  if (options.web) {
    const { getSearchResults } = await import("../search/search");
    try {
      // Search for relevant information based on the request
      const searchResults = await getSearchResults(`solidity ${request}`);
      webContext = `Web search results:\n${searchResults}`;
    } catch (e) {
      console.warn("Warning: Could not perform web search:", e);
    }
  }
  
  const context = [
    `platform: ${process.platform}`,
    
    `contract:`,
    `"""
${contractContent}
"""`,
    
    webContext,
    ...docsContext,
  ]
    .filter(notEmpty)
    .join("\n");
  
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are an expert Solidity and blockchain developer who specializes in analyzing, understanding, and improving smart contracts.
      
You excel at providing detailed, technical responses to queries about smart contracts. Your expertise covers:
- Smart contract security and vulnerabilities
- Gas optimization
- Code quality and best practices
- Blockchain technology and ecosystem
- Smart contract upgradability
- Testing and verification
- Common design patterns
- Advanced Solidity features

Provide a comprehensive, well-structured response to the user's query about the provided smart contract.
Use markdown for better readability, including code examples where appropriate.
`
    },
    {
      role: "user",
      content: [
        context && `CONTEXT:\n${context}`,
        `CONTRACT REQUEST: ${request}`,
      ]
        .filter(Boolean)
        .join("\n\n")
    },
  ];
  
  try {
    let content = "";
    
    if (options.stream !== false) {
      const stream = await openai.chat.completions.create({
        model: modelId,
        messages,
        stream: true,
      });
      
      for await (const chunk of stream) {
        const content_chunk = chunk.choices[0]?.delta?.content || "";
        content += content_chunk;
        logUpdate(renderMarkdown(content));
      }
      logUpdate.done();
    } else {
      const completion = await openai.chat.completions.create({
        model: modelId,
        messages,
      });
      content = completion.choices[0].message.content || "";
      console.log(renderMarkdown(content));
    }
    
    // Save output if specified
    if (options.output) {
      const outputPath = options.output.endsWith('.md') ? options.output : `${options.output}.md`;
      fs.writeFileSync(outputPath, content);
      console.log(`\n✅ Response saved to ${outputPath}`);
    }
    
    return { response: content };
  } catch (error) {
    console.error("Error processing contract request:", error);
    throw error;
  }
} 