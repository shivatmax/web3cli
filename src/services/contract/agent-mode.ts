/**
 * Agent Mode for Contract Generation
 * 
 * This module provides functionality for running a multi-agent system
 * to generate smart contracts with specialized agents collaborating together.
 */
import fs from "node:fs";
import { VectorDB } from "../vector-db/vector-db.js";
import { getSearchResults } from "../search/search.js";
import { loadConfig } from "../config/config.js";
import { getSDKModel } from "../ai/ai-sdk.js";
import logUpdate from "log-update";
import { renderMarkdown, stripMarkdownCodeBlocks } from "../../utils/markdown.js";
import path from "path";
import ora from "ora";

/**
 * Options for agent mode
 */
export interface AgentModeOptions {
  model?: string;
  hardhat?: boolean;
  output?: string;
  search?: boolean;
  readDocs?: string;
  stream?: boolean;
  proxy?: 'transparent' | 'uups';
}

/**
 * Agent interface
 */
interface Agent {
  name: string;
  description: string;
  emoji: string;
  execute: (input: any, context: AgentContext) => Promise<any>;
  extractKeyTerms?: (input: string, context: AgentContext) => Promise<string[]>;
  generateSearchQueries?: (input: string, context: AgentContext) => Promise<string[]>;
}

/**
 * Agent context shared between agents
 */
interface AgentContext {
  prompt: string;
  options: AgentModeOptions;
  openai: any;
  modelId: string;
  agentLog: string[];
  contractCode?: string;
  securityNotes?: string;
  testCode?: string;
  lintingResults?: string;
  functionalityCheck?: string;
  webSearchResults?: string[];
  vectorSearchResults?: string[];
}

/**
 * Log an agent's activity
 */
function logAgentActivity(agent: Agent, message: string, context: AgentContext): void {
  const logMessage = `${agent.emoji} ${agent.name} Agent --> ${message}`;
  console.log(logMessage);
  context.agentLog.push(logMessage);
}

/**
 * Ensures a directory exists, creating it and any parent directories if needed
 * @param dirPath Directory path to ensure exists
 */
function ensureDirectoryExists(dirPath: string): void {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Safely write file content to a path, ensuring directory exists
 * @param filePath Path to write to
 * @param content Content to write
 * @returns true if successful
 */
function safeWriteFileSync(filePath: string, content: string): boolean {
  try {
    const dir = path.dirname(filePath);
    ensureDirectoryExists(dir);
    fs.writeFileSync(filePath, content);
    return true;
  } catch (error) {
    console.error(`❌ Error writing to ${filePath}:`, error);
    return false;
  }
}

/**
 * Run the agent mode for smart contract generation
 * 
 * @param prompt The natural language requirements
 * @param options Options for generation
 * @returns Generated contract, security notes, and optional tests
 */
export async function runAgentMode(
  prompt: string, 
  options: AgentModeOptions = {}
): Promise<{
  code: string;
  securityNotes: string;
  testCode?: string;
  logs: string[];
}> {
  console.log('➤ 🚀 Initializing Advanced Agentic System…');
  console.log('➤ 📊 Setting up specialized agents…');
  
  try {
    // Load configuration
    const config = loadConfig();
    
    // Set up model based on configuration or defaults
    const modelId = options.model || config.default_model || "gpt-4o-mini";
    
    // Set up OpenAI client
    const openai = await getSDKModel(modelId, config);
    
    // Initialize agent context
    const context: AgentContext = {
      prompt,
      options,
      openai,
      modelId,
      agentLog: [],
    };
    
    // Define the agents
    const agents: Agent[] = [
      // Vector Store Search Agent
      {
        name: "Vector Store Search",
        description: "Searches vector database for relevant documentation",
        emoji: "📚",
        async execute(input, context) {
          logAgentActivity(this, "Analyzing prompt to create optimal search queries", context);
          
          if (!context.options.readDocs) {
            logAgentActivity(this, "No vector database specified, skipping search", context);
            return null;
          }
          
          logAgentActivity(this, `Searching vector database for information about: ${input}`, context);
          
          try {
            const db = new VectorDB();
            const keyTerms = await this.extractKeyTerms?.(input, context) || [];
            context.vectorSearchResults = [];
            
            logAgentActivity(this, `Identified key search terms: ${keyTerms.join(", ")}`, context);
            
            for (const term of keyTerms) {
              logAgentActivity(this, `Searching for: ${term}`, context);
              const docs = await db.similaritySearch(context.options.readDocs, term, 3);
              if (docs.length > 0) {
                const results = docs.map(d => d.pageContent || '').join("\n\n");
                context.vectorSearchResults.push(`Results for "${term}":\n${results}`);
                logAgentActivity(this, `Found ${docs.length} relevant documents for "${term}"`, context);
              }
            }
            
            return context.vectorSearchResults.length > 0 
              ? context.vectorSearchResults.join("\n\n---\n\n") 
              : "No relevant documentation found.";
          } catch (e) {
            logAgentActivity(this, `Error searching vector database: ${e}`, context);
            return "Error searching vector database.";
          }
        },
        
        async extractKeyTerms(input: string, context: AgentContext): Promise<string[]> {
          logAgentActivity(this, "Extracting key terms for search", context);
          
          const messages = [
            {
              role: "system",
              content: `You are an expert in creating search queries from user requirements. 
              Extract 3-5 key technical terms or concepts from the input that would be most useful for searching technical documentation.
              Return ONLY a JSON array of strings without any explanation.`
            },
            {
              role: "user",
              content: input
            }
          ];
          
          const response = await context.openai.chat.completions.create({
            model: context.modelId,
            messages,
            response_format: { type: "json_object" },
          });
          
          try {
            const content = response.choices[0].message.content;
            const parsed = JSON.parse(content);
            return parsed.terms || [];
          } catch (e) {
            logAgentActivity(this, `Error parsing key terms: ${e}`, context);
            // Fallback to basic extraction
            const words = input.split(/\s+/).filter(w => w.length > 4);
            return words.slice(0, 3);
          }
        }
      },
      
      // Web Search Agent
      {
        name: "Web Search",
        description: "Searches the web for relevant information",
        emoji: "🔎",
        async execute(input, context) {
          if (!context.options.search) {
            logAgentActivity(this, "Web search not requested, skipping", context);
            return null;
          }
          
          logAgentActivity(this, "Analyzing prompt to create optimal web search queries", context);
          
          const searchQueries = await this.generateSearchQueries?.(input, context) || [`solidity ${input.slice(0, 50)}`];
          context.webSearchResults = [];
          
          logAgentActivity(this, `Generated search queries: ${searchQueries.join(", ")}`, context);
          
          for (const query of searchQueries) {
            logAgentActivity(this, `Searching web for: ${query}`, context);
            const results = await getSearchResults(query);
            context.webSearchResults.push(`Results for "${query}":\n${results}`);
            logAgentActivity(this, `Completed search for: ${query}`, context);
          }
          
          return context.webSearchResults.join("\n\n---\n\n");
        },
        
        async generateSearchQueries(input: string, context: AgentContext): Promise<string[]> {
          const messages = [
            {
              role: "system",
              content: `You are an expert in creating web search queries from user requirements.
              Generate 2-3 specific search queries related to Solidity and blockchain development
              that would help find relevant information for the given task.
              Return ONLY a JSON array of strings without any explanation.`
            },
            {
              role: "user",
              content: input
            }
          ];
          
          const response = await context.openai.chat.completions.create({
            model: context.modelId,
            messages,
            response_format: { type: "json_object" },
          });
          
          try {
            const content = response.choices[0].message.content;
            const parsed = JSON.parse(content);
            return parsed.queries || [];
          } catch (e) {
            logAgentActivity(this, `Error parsing search queries: ${e}`, context);
            // Fallback
            return [`solidity ${input.slice(0, 50)}...`];
          }
        }
      },
      
      // Code Writing Agent
      {
        name: "Code Writer",
        description: "Writes Solidity smart contract code",
        emoji: "✍️",
        async execute(input, context) {
          logAgentActivity(this, "Starting smart contract generation", context);
          
          // Gather context information from other agents
          let contextInfo = "";
          
          if (context.webSearchResults && context.webSearchResults.length > 0) {
            logAgentActivity(this, "Incorporating web search results into contract design", context);
            contextInfo += "\n\nWEB SEARCH RESULTS:\n" + context.webSearchResults.join("\n\n");
          }
          
          if (context.vectorSearchResults && context.vectorSearchResults.length > 0) {
            logAgentActivity(this, "Incorporating documentation from vector search", context);
            contextInfo += "\n\nDOCUMENTATION:\n" + context.vectorSearchResults.join("\n\n");
          }
          
          const contractMessages = [
            {
              role: "system",
              content: `You are an expert Solidity developer tasked with creating secure, efficient, and well-documented smart contracts.
              
Output only valid Solidity code without additional explanations. The contract should:
- Use the most recent Solidity version (^0.8.20)
- Be secure, following all best practices
- Use appropriate OpenZeppelin contracts when relevant
- Include comprehensive NatSpec documentation
- Be gas-efficient
- Include appropriate events, modifiers, and access control
${context.options.proxy === 'transparent' ? '\n- Implement upgradeability using OpenZeppelin TransparentUpgradeableProxy pattern and organise code in contracts/, proxy/, and scripts/ folders' : ''}${context.options.proxy === 'uups' ? '\n- Implement upgradeability using OpenZeppelin UUPSUpgradeable pattern and organise code in contracts/, proxy/, and scripts/ folders' : ''}
`
            },
            {
              role: "user",
              content: [
                `TASK: Create a Solidity smart contract that satisfies the following requirements:`,
                input,
                contextInfo
              ].filter(Boolean).join("\n\n")
            }
          ];
          
          logAgentActivity(this, "Generating smart contract code...", context);
          
          let contractCode = "";
          
          if (context.options.stream !== false) {
            const stream = await context.openai.chat.completions.create({
              model: context.modelId,
              messages: contractMessages as any,
              stream: true,
            });
  
            logAgentActivity(this, "Writing code (streaming output)...", context);
            for await (const chunk of stream) {
              const content_chunk = chunk.choices[0]?.delta?.content || "";
              contractCode += content_chunk;
              logUpdate(renderMarkdown(contractCode));
            }
            logUpdate.done();
          } else {
            const completion = await context.openai.chat.completions.create({
              model: context.modelId,
              messages: contractMessages as any,
            });
            contractCode = completion.choices[0].message.content || "";
            console.log(renderMarkdown(contractCode));
          }
          
          logAgentActivity(this, "Completed initial code generation", context);
          context.contractCode = contractCode;
          
          return contractCode;
        }
      },
      
      // Linting Agent
      {
        name: "Linter",
        description: "Checks code for styling and best practices",
        emoji: "🧹",
        async execute(input: string, context: AgentContext) {
          if (input) {
            logAgentActivity(this, "Linter input provided, using it to lint the code", context);
            context.contractCode = input;
          } else if (!context.contractCode) {
            logAgentActivity(this, "No contract code available to lint", context);
            return null;
          }
          
          logAgentActivity(this, "Performing linting checks on generated code", context);
          
          const lintMessages = [
            {
              role: "system",
              content: `You are a Solidity linting expert. Analyze the provided smart contract for:
              1. Style inconsistencies
              2. Non-adherence to Solidity style guides
              3. Code organization issues
              4. Naming convention violations
              5. Comments and documentation issues
              
              For each issue found, provide the specific line/code and a suggested fix.
              If no issues are found in a category, mention that explicitly.
              `
            },
            {
              role: "user",
              content: context.contractCode
            }
          ];
          
          const lintingResponse = await context.openai.chat.completions.create({
            model: context.modelId,
            messages: lintMessages as any,
          });
          
          const lintingResults = lintingResponse.choices[0].message.content;
          context.lintingResults = lintingResults;
          
          logAgentActivity(this, "Linting complete, identified style and convention issues", context);
          console.log(renderMarkdown(lintingResults));
          
          // Check if code needs to be updated based on linting
          if (lintingResults.toLowerCase().includes("issue") || 
              lintingResults.toLowerCase().includes("violation") ||
              lintingResults.toLowerCase().includes("inconsistenc")) {
            
            logAgentActivity(this, "Sending linting issues back to Code Writer for correction", context);
            
            // Sending to Code Writer for fixes
            const fixMessages = [
              {
                role: "system",
                content: `You are an expert Solidity developer. Fix the code based on the linting feedback.
                Return ONLY the fixed code without explanations or comments about the changes.`
              },
              {
                role: "user",
                content: `Code:\n\n${context.contractCode}\n\nLinting feedback:\n\n${lintingResults}\n\nPlease fix all the issues.`
              }
            ];
            
            const fixResponse = await context.openai.chat.completions.create({
              model: context.modelId,
              messages: fixMessages as any,
            });
            
            const fixedCodeLLMResponse = fixResponse.choices[0].message.content;
            let potentialFixedLintedCode = stripMarkdownCodeBlocks(fixedCodeLLMResponse || "");

            if (potentialFixedLintedCode && potentialFixedLintedCode.includes("pragma solidity") && potentialFixedLintedCode.length > 100) {
              context.contractCode = potentialFixedLintedCode; // Store clean code
              logAgentActivity(this, "Code has been corrected based on linting feedback", context);
              console.log(renderMarkdown(context.contractCode));
              
              // Return an object that includes both original results and fixed code for clarity in logs/return value
              // This specific return structure might need adjustment based on how it's used or logged.
              // For now, the primary goal is to correctly update context.contractCode.
            } else {
              logAgentActivity(this, `Linter LLM failed to provide valid fixed code. Output: '${fixedCodeLLMResponse}'. Retaining previous code.`, context);
              // context.contractCode remains unchanged
            }
            
            // The return here should reflect whether a fix was applied or not, 
            // and what the current state of lintingResults is.
            // For simplicity, we return the original lintingResults if fix failed, 
            // or an object including fixedCode if successful.
            // This part of the return might need to be harmonized across agents if they are expected to return a consistent structure.
            return {
              lintingResults,
              fixedCode: (potentialFixedLintedCode && potentialFixedLintedCode.includes("pragma solidity") && potentialFixedLintedCode.length > 100) ? context.contractCode : undefined
            };
          }
          
          return lintingResults; // Return original results if no fix was attempted
        }
      },
      
      // Security Audit Agent
      {
        name: "Security Auditor",
        description: "Performs security audit of smart contract code",
        emoji: "🔒",
        async execute(input: string, context: AgentContext) {
          if (input) {
            logAgentActivity(this, "Security audit input provided, using it to audit the code", context);
            context.contractCode = input;
          } else if (!context.contractCode) {
            logAgentActivity(this, "No contract code available to audit", context);
            return null;
          }
          
          logAgentActivity(this, "Beginning comprehensive security audit", context);
          
          const securityMessages = [
            {
              role: "system",
              content: `You are a smart contract security auditor specialized in identifying vulnerabilities and potential issues in Solidity code.
              
Provide a security assessment that includes:
1. Identified vulnerabilities or security concerns
2. Recommendations for improvements
3. Best practices that should be followed
4. Overall security rating (Low/Medium/High risk)
`
            },
            {
              role: "user",
              content: `Please perform a security audit on the following smart contract:\n\n${context.contractCode}`
            }
          ];
          
          let securityNotes = "";
          
          if (context.options.stream !== false) {
            logAgentActivity(this, "Performing detailed security analysis (streaming output)...", context);
            const stream = await context.openai.chat.completions.create({
              model: context.modelId,
              messages: securityMessages as any,
              stream: true,
            });
  
            for await (const chunk of stream) {
              const content_chunk = chunk.choices[0]?.delta?.content || "";
              securityNotes += content_chunk;
              logUpdate(renderMarkdown(securityNotes));
            }
            logUpdate.done();
          } else {
            const completion = await context.openai.chat.completions.create({
              model: context.modelId,
              messages: securityMessages as any,
            });
            securityNotes = completion.choices[0].message.content || "";
            console.log(renderMarkdown(securityNotes));
          }
          
          context.securityNotes = securityNotes;
          
          // Check if security issues need to be fixed
          if (securityNotes.toLowerCase().includes("vulnerability") || 
              securityNotes.toLowerCase().includes("high risk") ||
              securityNotes.toLowerCase().includes("medium risk")) {
            
            logAgentActivity(this, "Critical security issues found, sending back to Code Writer for urgent fixes", context);
            
            // Send security issues back to Code Writer
            const fixMessages = [
              {
                role: "system",
                content: "You are an expert Solidity developer. Fix the code based on the security audit feedback. Return ONLY the fixed code without explanations or comments about the changes."
              },
              {
                role: "user",
                content: `Security Audit Findings:\n${securityNotes}\n\nCode with issues:\n${context.contractCode}\n\nPlease provide the fixed Solidity code.`
              }
            ];
            
            const fixResponse = await context.openai.chat.completions.create({
              model: context.modelId,
              messages: fixMessages as any,
            });
            const fixedCodeLLMResponse = fixResponse.choices[0].message.content;
            let potentialFixedSecurityCode = stripMarkdownCodeBlocks(fixedCodeLLMResponse || "");

            if (potentialFixedSecurityCode && potentialFixedSecurityCode.includes("pragma solidity") && potentialFixedSecurityCode.length > 100) {
              context.contractCode = potentialFixedSecurityCode; // Store clean code
              logAgentActivity(this, "Code has been updated to address security concerns", context);
              console.log(renderMarkdown(context.contractCode));
              
              // Re-audit the code after fixes
              logAgentActivity(this, "Re-auditing code after security fixes", context);
              const reauditMessages = [
                {
                  role: "system",
                  content: "You are a security auditor specializing in Solidity. Re-evaluate the updated code focusing on the previously identified issues and any new potential vulnerabilities."
                },
                {
                  role: "user",
                  content: `Original Audit Findings:\n${securityNotes}\n\nUpdated Code:\n${context.contractCode}\n\nPlease provide an updated security assessment.`
                }
              ];
              const reauditResponse = await context.openai.chat.completions.create({
                model: context.modelId,
                messages: reauditMessages as any,
                stream: true,
              });
              
              let reauditNotes = "";
              logUpdate(`➤ ${this.emoji} ${this.name} --> Security re-audit in progress (streaming output)...\n`);
              for await (const chunk of reauditResponse) {
                const content = chunk.choices[0]?.delta?.content || "";
                process.stdout.write(content);
                reauditNotes += content;
              }
              logUpdate.done();
              context.securityNotes = (context.securityNotes || "") + "\n\n--- Re-audit after fixes ---\n" + reauditNotes;
              logAgentActivity(this, "Security re-audit complete after fixes", context);

            } else {
              logAgentActivity(this, `Security Auditor LLM failed to provide valid fixed code. Output: '${fixedCodeLLMResponse}'. Retaining previous code and skipping re-audit.`, context);
              // context.contractCode remains unchanged, and re-audit is skipped
            }
            
            // Return the original audit and any updated notes (which includes re-audit if performed)
            return {
              originalAudit: securityNotes,
              updatedAuditNotes: context.securityNotes // This will contain re-audit if fix was successful
            };
          }
          
          logAgentActivity(this, "Security audit complete (no critical issues found or fix attempt not made).", context);
          return securityNotes; // Return original audit if no fix was attempted or necessary
        }
      },
      
      // Functionality Check Agent
      {
        name: "Functionality Checker",
        description: "Validates contract functionality against requirements",
        emoji: "✅",
        async execute(input, context) {
          if (!context.contractCode) {
            logAgentActivity(this, "No contract code available to check functionality", context);
            return null;
          }
          
          logAgentActivity(this, "Verifying that contract meets all functional requirements", context);
          
          const functionalityMessages = [
            {
              role: "system",
              content: `You are a Solidity code reviewer focused on functionality verification. 
              
1. Analyze the smart contract against the requirements
2. Check if all required features are implemented
3. Verify that the contract behavior matches the requested functionality
4. Identify any gaps or missing requirements
5. Suggest improvements if needed
              
Be specific and thorough in your assessment.`
            },
            {
              role: "user",
              content: `Requirements:\n\n${input}\n\nImplemented Contract:\n\n${context.contractCode}\n\nPlease verify the functionality.`
            }
          ];
          
          const functionalityResponse = await context.openai.chat.completions.create({
            model: context.modelId,
            messages: functionalityMessages as any,
          });
          
          const functionalityCheck = functionalityResponse.choices[0].message.content;
          context.functionalityCheck = functionalityCheck;
          
          logAgentActivity(this, "Functionality verification complete", context);
          console.log(renderMarkdown(functionalityCheck));
          
          // Check if functionality issues need to be addressed
          if (functionalityCheck.toLowerCase().includes("missing") || 
              functionalityCheck.toLowerCase().includes("not implemented") ||
              functionalityCheck.toLowerCase().includes("gap")) {
            
            logAgentActivity(this, "Functionality gaps detected, sending back to Code Writer for completion", context);
            
            // Send functionality issues back to Code Writer
            const fixMessages = [
              {
                role: "system",
                content: `You are an expert Solidity developer. Address the functionality gaps identified in the review.
                Return the complete updated code with all functionality requirements addressed. Do not include explanations.`
              },
              {
                role: "user",
                content: `Requirements:\n\n${input}\n\nCurrent Code:\n\n${context.contractCode}\n\nFunctionality review:\n\n${functionalityCheck}\n\nPlease update the code to address all functionality gaps.`
              }
            ];
            
            const fixResponse = await context.openai.chat.completions.create({
              model: context.modelId,
              messages: fixMessages as any,
            });
            
            const updatedCodeLLMResponse = fixResponse.choices[0].message.content;
            let potentialUpdatedFunctionalityCode = stripMarkdownCodeBlocks(updatedCodeLLMResponse || "");

            if (potentialUpdatedFunctionalityCode && potentialUpdatedFunctionalityCode.includes("pragma solidity") && potentialUpdatedFunctionalityCode.length > 100) {
              context.contractCode = potentialUpdatedFunctionalityCode; // Store clean code
              logAgentActivity(this, "Code has been updated to address all functionality requirements", context);
              console.log(renderMarkdown(context.contractCode));
            } else {
              logAgentActivity(this, `Functionality Checker LLM failed to provide valid updated code. Output: '${updatedCodeLLMResponse}'. Retaining previous code.`, context);
              // context.contractCode remains unchanged
            }
            
            // The return value could indicate success/failure or the updated check.
            // For now, returning the original check, as context.contractCode is the primary output.
            return functionalityCheck; 
          }
          
          logAgentActivity(this, "Functionality verification complete (no gaps found or fix attempt not made).", context);
          return functionalityCheck; // Return original check if no fix was attempted
        }
      },
      
      // Test Generation Agent
      {
        name: "Test Generator",
        description: "Creates comprehensive test suite",
        emoji: "🧪",
        async execute(input: string, context: AgentContext) {
          // The 'input' parameter for this agent is the original user prompt.
          // It should NOT be assigned to context.contractCode here, as that would overwrite the generated contract.
          // context.contractCode should already contain the refined code from previous agents.

          if (!context.contractCode) {
            logAgentActivity(this, "No contract code available for test generation. The 'input' prompt was: " + input, context);
            // Optionally, one could use 'input' as a fallback if context.contractCode is unexpectedly empty,
            // but that would likely mean trying to generate tests for a natural language prompt.
            // For now, if context.contractCode is missing, we cannot generate tests.
            return null; 
          }
          
          if (!context.options.hardhat) {
            logAgentActivity(this, "Test generation not requested (Hardhat option not enabled).", context);
            return null;
          }
          
          logAgentActivity(this, "Generating comprehensive test suite for smart contract", context);
          
          // Ensure context.contractCode is used for test generation messages
          const testMessages = [
            {
              role: "system",
              content: "You are a smart contract testing expert who writes thorough Hardhat test suites in JavaScript.\n\n" +
                "Provide a comprehensive test suite that:\n" +
                "1. Tests all major functionality of the contract\n" +
                "2. Includes both positive and negative test cases\n" +
                "3. Tests edge cases and potential security issues\n" +
                "4. Uses best practices for Hardhat/Ethers.js testing\n\n" +
                "IMPORTANT FORMATTING INSTRUCTIONS:\n" +
                "1. Start your response with \"```javascript\" and end with \"```\"\n" +
                "2. Include ONLY valid JavaScript test code within these markers\n" +
                "3. Ensure all tests can run with Hardhat and ethers.js\n" +
                "4. DO NOT include explanations before or after the test code block\n" +
                "5. Make tests focused on the specific contract functionality\n" +
                "6. Include tests for all key contract functions\n" +
                "7. For NFT contracts with royalties, include tests for royalty calculations"
            },
            {
              role: "user",
              content: "Create a Hardhat test suite for the following smart contract:\n\n" +
                context.contractCode + "\n\n" + // Use context.contractCode here
                "Tests must verify:\n" +
                "- Contract deployment succeeds\n" +
                "- All core functions work as expected\n" +
                "- Security controls (if any) function properly\n" +
                "- Edge cases are handled correctly\n" +
                "- Events are emitted properly\n" +
                "- If royalty functionality exists, ensure royalty calculations work correctly\n\n" +
                "Return ONLY the test code, properly formatted within a code block."
            }
          ];
          
          const spinner = ora(`➤ ${this.emoji} ${this.name} --> Writing tests (streaming output)...`).start();
          
          const testResponse = await context.openai.chat.completions.create({
            model: context.modelId,
            messages: testMessages as any, // Cast to any to avoid type issues with roles/content structure
            stream: true,
          });

          let testCode = "";
          spinner.stop(); // Stop spinner before direct stdout writing
          process.stdout.write(`➤ ${this.emoji} ${this.name} --> Test stream: `); // Initial prefix for the stream
          for await (const chunk of testResponse) {
            const content = chunk.choices[0]?.delta?.content || "";
            process.stdout.write(content); // Stream directly
            testCode += content;
          }
          process.stdout.write('\n'); // Newline after stream
          spinner.succeed(`➤ ${this.emoji} ${this.name} --> Test stream complete.`); // Use succeed message
          
          context.testCode = testCode;
          logAgentActivity(this, "Test suite generation complete (after stream)", context);
          
          return testCode;
        }
      }
    ];
    
    // Orchestrate the agents
    console.log("\n🔄 Orchestrating agent collaboration workflow...\n");
    
    // Step 1: First gather information from vector store and web search
    await agents[0].execute(prompt, context); // Vector Store Search
    await agents[1].execute(prompt, context); // Web Search
    
    // Step 2: Generate initial code
    await agents[2].execute(prompt, context); // Code Writer
    
    // Step 3: Check linting
    await agents[3].execute(prompt, context); // Linter
    
    // Step 4: Security audit
    await agents[4].execute(prompt, context); // Security Auditor
    
    // Step 5: Verify functionality
    await agents[5].execute(prompt, context); // Functionality Checker
    
    // Step 6: Generate tests
    await agents[6].execute(prompt, context); // Test Generator
    
    // Save files if output option is provided
    if (options.output && context.contractCode) {
      console.log(`\n💾 Saving files to disk...`);
      
      try {
        // Create output directory if it doesn't exist
        const outputDir = path.dirname(options.output);
        ensureDirectoryExists(outputDir);
        
        // Strip markdown formatting before saving to file
        console.log(`[DEBUG_SAVE] context.contractCode BEFORE stripMarkdownCodeBlocks: ${JSON.stringify(context.contractCode)}`);
        let cleanContractCode = stripMarkdownCodeBlocks(context.contractCode);
        console.log(`[DEBUG_SAVE] cleanContractCode AFTER stripMarkdownCodeBlocks: ${JSON.stringify(cleanContractCode)}`);
        
        // If the code is still just the prompt or very short, it might indicate an issue with extraction
        if (cleanContractCode.length < 100 || cleanContractCode === context.prompt) { 
          console.log(`[DEBUG_SAVE] Warning: Extracted code seems incomplete or matches prompt. Length: ${cleanContractCode.length}.`);
          // If the initial stripping results in the prompt or very short code, 
          // and if context.contractCode (the raw LLM output) is different and longer,
          // try stripping the raw LLM output again, assuming it might have had more context.
          if (context.contractCode !== cleanContractCode && context.contractCode.length > cleanContractCode.length) {
            console.log(`[DEBUG_SAVE] Trying alternative extraction on raw context.contractCode.`);
            let aggressiveClean = stripMarkdownCodeBlocks(context.contractCode); // Re-strip the original
            if (aggressiveClean.length > cleanContractCode.length && aggressiveClean.includes('pragma solidity')){
              cleanContractCode = aggressiveClean;
              console.log(`[DEBUG_SAVE] Alternative extraction yielded better code.`);
            } else {
              console.log(`[DEBUG_SAVE] Alternative extraction did not yield better code or still lacks Solidity content.`);
            }
          }
        }
        
        console.log(`[DEBUG_SAVE] cleanContractCode BEFORE final 'pragma solidity' check: ${JSON.stringify(cleanContractCode)}`);
        // Ensure the file has proper Solidity content
        if (!cleanContractCode.includes('pragma solidity')) {
          console.log(`❌ Error: Could not extract valid Solidity code from generated content`);
          // Save what we have anyway, but with a warning
          cleanContractCode = `// WARNING: This file does not contain valid Solidity code
// Original prompt: ${prompt}
// Generated content might be in incorrect format

${cleanContractCode}`;
        }
        
        // Save contract file
        if (safeWriteFileSync(options.output, cleanContractCode)) {
          console.log(`✅ Contract saved to ${options.output}`);
        }
        
        // Save security notes if available
        if (context.securityNotes) {
          const securityPath = options.output.replace(/\.sol$/, '.security.md');
          if (safeWriteFileSync(securityPath, context.securityNotes)) {
            console.log(`✅ Security audit saved to ${securityPath}`);
          }
        }
        
        // Save test code if available
        if (context.testCode) {
          const testPath = options.output.replace(/\.sol$/, '.test.js');
          // Extract test code more carefully too
          let cleanTestCode = stripMarkdownCodeBlocks(context.testCode);
          
          // If the test code seems too short, try alternative extraction
          if (cleanTestCode.length < 100) {
            console.log(`⚠️ Warning: Extracted test code seems incomplete, trying alternative extraction...`);
            
            // Try a more aggressive regex for JavaScript code blocks
            const jsCodeRegex = /```(?:javascript|js|test)?\s*([\s\S]+?)```/g;
            const matches = Array.from(context.testCode.matchAll(jsCodeRegex));
            
            if (matches.length > 0) {
              // Use the largest code block found
              const largestMatch = matches.reduce((largest, current) => 
                (current[1].length > largest[1].length) ? current : largest, matches[0]);
              
              cleanTestCode = largestMatch[1].trim();
              console.log(`✅ Used alternative extraction method to retrieve test code`);
            } else if (context.testCode.includes('describe(') || context.testCode.includes('expect(')) {
              // Extract based on typical testing keywords
              const describeIndex = context.testCode.indexOf('describe(');
              if (describeIndex !== -1) {
                cleanTestCode = context.testCode.substring(describeIndex).trim()
                  .replace(/```.*$/m, '').trim(); // Remove trailing code block markers
                console.log(`✅ Extracted test code using test function identifier`);
              }
            }
          }
          
          if (safeWriteFileSync(testPath, cleanTestCode)) {
            console.log(`✅ Test file saved to ${testPath}`);
          }
        }
        
        // Save agent logs
        const logsPath = options.output.replace(/\.sol$/, '.agent-logs.md');
        if (safeWriteFileSync(logsPath, context.agentLog.join('\n'))) {
          console.log(`✅ Agent logs saved to ${logsPath}`);
        }
      } catch (error) {
        console.error(`❌ Error saving files:`, error);
      }
    }
    
    console.log("\n✨ Agentic workflow complete - all agents have successfully collaborated!");
    
    return {
      code: context.contractCode || "",
      securityNotes: context.securityNotes || "",
      testCode: context.testCode,
      logs: context.agentLog
    };
  } catch (error) {
    console.error("❌ Error in Advanced Agentic System:", error);
    throw error;
  }
}