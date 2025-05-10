/**
 * Agent Mode for Contract Generation
 * 
 * This module provides functionality for running a multi-agent system
 * to generate smart contracts with specialized agents collaborating together.
 */
import fs from "node:fs";
import { VectorDB } from "../vector-db/vector-db";
import { getSearchResults } from "../search/search";
import { loadConfig } from "../config/config";
import { getSDKModel } from "../ai/ai-sdk";
import logUpdate from "log-update";
import { renderMarkdown, stripMarkdownCodeBlocks } from "../../utils/markdown";
import path from "path";

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
  console.log("🚀 Initializing Advanced Agentic System for smart contract generation...");
  console.log("📊 Setting up specialized agents for collaborative development...");
  
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
        async execute(input, context) {
          if (!context.contractCode) {
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
            
            const fixedCode = fixResponse.choices[0].message.content;
            context.contractCode = fixedCode;
            
            logAgentActivity(this, "Code has been corrected based on linting feedback", context);
            console.log(renderMarkdown(fixedCode));
            
            return {
              lintingResults,
              fixedCode
            };
          }
          
          return lintingResults;
        }
      },
      
      // Security Audit Agent
      {
        name: "Security Auditor",
        description: "Performs security audit of smart contract code",
        emoji: "🔒",
        async execute(input, context) {
          if (!context.contractCode) {
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
                content: `You are an expert Solidity developer. Fix the security issues identified in the audit.
                Return ONLY the fixed code with all security issues addressed. Do not include explanations or comments about the changes.`
              },
              {
                role: "user",
                content: `Code:\n\n${context.contractCode}\n\nSecurity audit:\n\n${securityNotes}\n\nPlease fix all security issues.`
              }
            ];
            
            const fixResponse = await context.openai.chat.completions.create({
              model: context.modelId,
              messages: fixMessages as any,
            });
            
            const fixedCode = fixResponse.choices[0].message.content;
            context.contractCode = fixedCode;
            
            logAgentActivity(this, "Code has been updated to address security concerns", context);
            console.log(renderMarkdown(fixedCode));
            
            // Re-run security audit on fixed code
            logAgentActivity(this, "Re-auditing code after security fixes", context);
            
            const reauditMessages = [
              {
                role: "system",
                content: `You are a smart contract security auditor specialized in identifying vulnerabilities and potential issues in Solidity code.
                
Provide a security assessment that includes:
1. Identified vulnerabilities or security concerns
2. Recommendations for improvements
3. Best practices that should be followed
4. Overall security rating (Low/Medium/High risk)

Focus on whether the previous security issues have been properly addressed.`
              },
              {
                role: "user",
                content: `Please perform a security audit on the following smart contract after fixes:\n\n${fixedCode}\n\nPrevious security issues:\n\n${securityNotes}`
              }
            ];
            
            const reauditResponse = await context.openai.chat.completions.create({
              model: context.modelId,
              messages: reauditMessages as any,
            });
            
            const updatedNotes = reauditResponse.choices[0].message.content;
            context.securityNotes = updatedNotes;
            
            logAgentActivity(this, "Security re-audit complete after fixes", context);
            console.log(renderMarkdown(updatedNotes));
            
            return {
              originalAudit: securityNotes,
              fixedCode,
              updatedAudit: updatedNotes
            };
          }
          
          logAgentActivity(this, "Security audit complete", context);
          return securityNotes;
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
            
            const updatedCode = fixResponse.choices[0].message.content;
            context.contractCode = updatedCode;
            
            logAgentActivity(this, "Code has been updated to address all functionality requirements", context);
            console.log(renderMarkdown(updatedCode));
            
            return {
              functionalityCheck,
              updatedCode
            };
          }
          
          return functionalityCheck;
        }
      },
      
      // Test Generation Agent
      {
        name: "Test Generator",
        description: "Creates comprehensive test suite",
        emoji: "🧪",
        async execute(input, context) {
          if (!context.contractCode || !context.options.hardhat) {
            logAgentActivity(this, "Test generation not requested or no contract available", context);
            return null;
          }
          
          logAgentActivity(this, "Generating comprehensive test suite for smart contract", context);
          
          const testMessages = [
            {
              role: "system",
              content: `You are a smart contract testing expert who writes thorough Hardhat test suites in JavaScript.
              
Provide a comprehensive test suite that:
1. Tests all major functionality of the contract
2. Includes both positive and negative test cases
3. Tests edge cases and potential security issues
4. Uses best practices for Hardhat/Ethers.js testing
`
            },
            {
              role: "user",
              content: `Create a Hardhat test suite for the following smart contract:\n\n${context.contractCode}`
            }
          ];
          
          let testCode = "";
          
          if (context.options.stream !== false) {
            logAgentActivity(this, "Writing tests (streaming output)...", context);
            const stream = await context.openai.chat.completions.create({
              model: context.modelId,
              messages: testMessages as any,
              stream: true,
            });
  
            for await (const chunk of stream) {
              const content_chunk = chunk.choices[0]?.delta?.content || "";
              testCode += content_chunk;
              logUpdate(renderMarkdown(testCode));
            }
            logUpdate.done();
          } else {
            const completion = await context.openai.chat.completions.create({
              model: context.modelId,
              messages: testMessages as any,
            });
            testCode = completion.choices[0].message.content || "";
            console.log(renderMarkdown(testCode));
          }
          
          context.testCode = testCode;
          logAgentActivity(this, "Test suite generation complete", context);
          
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
        const cleanContractCode = stripMarkdownCodeBlocks(context.contractCode);
        
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
          // Strip markdown formatting from test code as well
          const cleanTestCode = stripMarkdownCodeBlocks(context.testCode);
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