/**
 * Contract Generation Service
 * 
 * This module provides functionality for generating smart contracts from
 * natural language descriptions.
 */
import fs from "node:fs";
import path from "node:path";
import { CoreMessage } from "ai";
import { getSDKModel } from "../ai/ai-sdk";
import { loadConfig } from "../config/config";
import { loadFiles, notEmpty } from "../../utils/common";
import { fetchUrl } from "../../utils/fetch-url";
import { VectorDB } from "../vector-db/vector-db";
import { CliError } from "../../utils/error";
import logUpdate from "log-update";
import { renderMarkdown, stripMarkdownCodeBlocks } from "../../utils/markdown";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

/**
 * Generate a smart contract from natural language
 * 
 * @param prompt The natural language prompt
 * @param options Generation options
 */
export async function generateContract(
  prompt: string,
  options: {
    model?: string;
    files?: string | string[];
    url?: string | string[];
    search?: boolean;
    stream?: boolean;
    output?: string;
    hardhat?: boolean;
    pipeInput?: string;
    readDocs?: string;
    proxy?: 'transparent' | 'uups';
  } = {}
) {
  if (!prompt) {
    throw new CliError("Please provide a prompt describing the smart contract");
  }

  console.log("Generating smart contract...");

  const config = loadConfig();
  const modelId = options.model || config.default_model || "gpt-4o-mini";
  const openai = await getSDKModel(modelId, config);

  const files = await loadFiles(options.files || []);
  const remoteContents = await fetchUrl(options.url || []);

  // Handle vector DB docs
  let docsContext: string[] = [];
  if (options.readDocs) {
    try {
      const vdb = new VectorDB();
      const docs = await vdb.similaritySearch(options.readDocs, prompt, 8);
      if (docs.length > 0) {
        docsContext = [
          `docs:${options.readDocs}:`,
          ...docs.map((d: { text?: string, pageContent?: string }) => `"""
${d.text || d.pageContent || ''}
"""`),
        ];
      }
    } catch (e) {
      // ignore if vector db fails
      console.warn("Warning: Could not retrieve docs from vector DB:", e);
    }
  }

  const context = [
    `platform: ${process.platform}\nsolidity: ^0.8.20`,

    options.pipeInput && [`stdin:`, "```", options.pipeInput, "```"].join("\n"),

    files.length > 0 && "files:",
    ...files.map((file) => `${file.name}:\n"""\n${file.content}\n"""`),

    remoteContents.length > 0 && "remote contents:",
    ...remoteContents.map(
      (content) => `${content.url}:
"""
${content.content}
"""`
    ),
    ...docsContext,
  ]
    .filter(notEmpty)
    .join("\n");

  // Determine proxy-specific guidelines
  let proxyGuideline = '';
  if (options.proxy === 'transparent') {
    proxyGuideline = 'Additionally, implement upgradeability using the OpenZeppelin TransparentUpgradeableProxy pattern. Provide the implementation contract with an initializer (no constructor) and include the TransparentUpgradeableProxy deployment setup. Organize the output in a folder structure such as contracts/, proxy/, and scripts/.';
  } else if (options.proxy === 'uups') {
    proxyGuideline = 'Additionally, implement upgradeability using the OpenZeppelin UUPS (Universal Upgradeable Proxy Standard) pattern. Ensure the implementation inherits from UUPSUpgradeable and has an initializer (no constructor). Organize the output in a folder structure such as contracts/, proxy/, and scripts/.';
  }

  const messages: CoreMessage[] = [
    {
      role: "system",
      content: `You are an expert Solidity developer who specializes in creating secure, efficient, and well-documented smart contracts.
      
Output only valid Solidity code without additional explanations. The contract should:
- Use the most recent Solidity version (^0.8.20)
- Be secure, following all best practices
- Use appropriate OpenZeppelin contracts when relevant
- Include comprehensive NatSpec documentation
- Be gas-efficient
- Include appropriate events, modifiers, and access control

${options.hardhat ? "After the contract, include a Hardhat test file that thoroughly tests the contract functionality." : ""}
${proxyGuideline}
`,
    },
    {
      role: "user",
      content: [
        context && `CONTEXT:\n${context}`,
        `TASK: Generate a Solidity smart contract for the following requirements:`,
        prompt,
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
        messages: messages as ChatCompletionMessageParam[],
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
        messages: messages as ChatCompletionMessageParam[],
      });
      content = completion.choices[0].message.content || "";
      console.log(renderMarkdown(content));
    }

    // Attempt to identify and save the contract
    if (options.output) {
      // Strip markdown formatting before saving
      const cleanContent = stripMarkdownCodeBlocks(content);
      
      // Create directory if it doesn't exist
      const outputDir = path.dirname(options.output);
      fs.mkdirSync(outputDir, { recursive: true });
      
      fs.writeFileSync(options.output, cleanContent);
      console.log(`\n✅ Contract saved to ${options.output}`);

      // If there's a test file section, save it separately
      if (options.hardhat && content.includes("// Test file")) {
        const testParts = content.split(/\/\/ Test file/);
        if (testParts.length >= 2) {
          const testContent = testParts[1].trim();
          // Strip markdown formatting from test code
          const cleanTestContent = stripMarkdownCodeBlocks(testContent);
          const testPath = options.output.replace(/\.sol$/, ".test.js");
          fs.writeFileSync(testPath, cleanTestContent);
          console.log(`✅ Test file saved to ${testPath}`);
        }
      }
    }

    return { code: content };
  } catch (error) {
    console.error("Error generating contract:", error);
    throw error;
  }
} 