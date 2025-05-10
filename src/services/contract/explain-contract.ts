/**
 * Contract Explanation Service
 * 
 * This module provides functionality for explaining smart contracts,
 * including their purpose, functions, and potential security issues.
 */
import fs from "node:fs";
import { getSDKModel } from "../ai/ai-sdk";
import { loadConfig } from "../config/config";
import { CliError } from "../../utils/error";
import logUpdate from "log-update";
import { renderMarkdown } from "../../utils/markdown";
import { VectorDB } from "../vector-db/vector-db";
import { CoreMessage } from "ai";
import { notEmpty } from "../../utils/common";

/**
 * Explain a smart contract by address or file path
 * 
 * @param source Contract address or file path
 * @param options Explanation options
 */
export async function explainContract(
  source: string,
  options: {
    model?: string;
    network?: string;
    stream?: boolean;
    readDocs?: string;
  } = {}
) {
  // Check if source is a file path or contract address
  const isFile = source.endsWith(".sol") || fs.existsSync(source);
  
  console.log(`Explaining ${isFile ? "contract file" : "deployed contract"}...`);
  
  // Load contract content
  let contractContent = "";
  if (isFile) {
    try {
      contractContent = fs.readFileSync(source, "utf8");
    } catch (error) {
      throw new CliError(`Failed to read contract file: ${error}`);
    }
  } else {
    // In a real implementation, this would fetch the contract bytecode and ABI from the blockchain
    // For this example, we'll use a placeholder
    contractContent = `// Contract would be fetched from ${options.network} network at address ${source}`;
  }
  
  const config = loadConfig();
  const modelId = options.model || config.default_model || "gpt-4o-mini";
  const openai = await getSDKModel(modelId, config);
  
  // Handle vector DB docs
  let docsContext: string[] = [];
  if (options.readDocs) {
    try {
      const vdb = new VectorDB();
      const docs = await vdb.similaritySearch(options.readDocs, contractContent.substring(0, 500), 5);
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
  
  const context = [
    `platform: ${process.platform}`,
    
    `contract:`,
    `"""
${contractContent}
"""`,
    
    ...docsContext,
  ]
    .filter(notEmpty)
    .join("\n");
  
  const messages: CoreMessage[] = [
    {
      role: "system",
      content: `You are an expert Solidity developer who specializes in analyzing and explaining smart contracts.
      
Provide a comprehensive explanation of the contract that includes:
1. Overall purpose and functionality
2. Key functions and their purposes
3. State variables and data structures
4. Access control mechanisms
5. Events and when they're emitted
6. Potential security concerns or vulnerabilities
7. Gas efficiency considerations
8. Best practices followed or violated

Structure your response with clear headings and bullet points where appropriate.
`,
    },
    {
      role: "user",
      content: [
        context && `CONTEXT:\n${context}`,
        `TASK: Explain the following smart contract in detail:`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];
  
  try {
    let content = "";
    
    if (options.stream !== false) {
      const stream = await openai.chat.completions.create({
        model: modelId,
        messages: [
          { role: "system", content: messages[0].content as string },
          { role: "user", content: messages[1].content as string }
        ],
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
        messages: [
          { role: "system", content: messages[0].content as string },
          { role: "user", content: messages[1].content as string }
        ],
      });
      content = completion.choices[0].message.content || "";
      console.log(renderMarkdown(content));
    }
    
    return { explanation: content };
  } catch (error) {
    console.error("Error explaining contract:", error);
    throw error;
  }
} 