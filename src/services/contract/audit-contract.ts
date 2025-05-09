/**
 * Contract Audit Service
 * 
 * This module provides functionality for auditing smart contracts,
 * identifying security vulnerabilities, and suggesting improvements.
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
 * Audit a smart contract for security vulnerabilities
 * 
 * @param source Contract address or file path
 * @param options Audit options
 * @returns Audit results with findings and fixed code
 */
export async function auditContract(
  source: string,
  options: {
    model?: string;
    network?: string;
    stream?: boolean;
    readDocs?: string;
    output?: string;
    fix?: boolean;
  } = {}
): Promise<{
  audit: string;
  fixedCode?: string;
}> {
  // Check if source is a file path or contract address
  const isFile = source.endsWith(".sol") || fs.existsSync(source);
  const isAddress = ethers.isAddress(source);
  
  console.log(`Auditing ${isFile ? "contract file" : isAddress ? "deployed contract" : "contract source"}...`);
  
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
  
  // Handle vector DB docs for security patterns and best practices
  let docsContext: string[] = [];
  if (options.readDocs) {
    try {
      const vdb = new VectorDB();
      // Search for relevant security docs
      const securityDocs = await vdb.similaritySearch(
        options.readDocs, 
        "solidity security vulnerabilities best practices " + contractContent.substring(0, 300), 
        5
      );
      if (securityDocs.length > 0) {
        docsContext = [
          `security_docs:${options.readDocs}:`,
          ...securityDocs.map((d) => `"""
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
  
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are an expert smart contract security auditor specializing in identifying vulnerabilities and potential issues in Solidity code.
      
Provide a comprehensive security audit that includes:
1. Executive summary with overall risk rating (Critical/High/Medium/Low)
2. Detailed findings with each issue categorized by severity
3. Specific code locations for each issue
4. Technical explanation of each vulnerability
5. Recommended fixes with code examples
6. Gas efficiency recommendations
7. Code quality and best practice suggestions

Format your response with clear headings and use markdown for better readability.
${options.fix ? "After listing all issues, provide a complete fixed version of the contract that addresses all identified issues." : ""}
`
    },
    {
      role: "user",
      content: [
        context && `CONTEXT:\n${context}`,
        `TASK: Perform a comprehensive security audit of the following smart contract:`,
      ]
        .filter(Boolean)
        .join("\n\n")
    },
  ];
  
  try {
    let content = "";
    let fixedCode = "";
    
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
    
    // Extract fixed code if requested
    if (options.fix && content.includes("```solidity")) {
      const matches = content.match(/```solidity\s*([\s\S]*?)\s*```/);
      if (matches && matches[1]) {
        fixedCode = matches[1].trim();
      }
    }
    
    // Save audit report and fixed code if output file is specified
    if (options.output) {
      // Save audit report
      const auditPath = options.output.endsWith('.md') 
        ? options.output 
        : options.output.replace(/\.sol$/, '') + '.audit.md';
      fs.writeFileSync(auditPath, content);
      console.log(`\n✅ Audit report saved to ${auditPath}`);
      
      // Save fixed code if available
      if (fixedCode && options.fix) {
        const fixedPath = options.output.endsWith('.sol') 
          ? options.output.replace(/\.sol$/, '.fixed.sol') 
          : options.output + '.fixed.sol';
        fs.writeFileSync(fixedPath, stripMarkdownCodeBlocks(fixedCode));
        console.log(`✅ Fixed contract saved to ${fixedPath}`);
      }
    }
    
    return { 
      audit: content,
      fixedCode: fixedCode || undefined
    };
  } catch (error) {
    console.error("Error auditing contract:", error);
    throw error;
  }
} 