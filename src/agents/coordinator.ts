import { Agent } from "../services/ai/mastra-shim.js";
import { z } from "zod";
import { CodeWriterAgent } from "./code-writer.js";
import { SecurityAuditAgent } from "./security-audit.js";
import { LintingAgent } from "./linting.js";
import { FunctionalityAgent } from "./functionality.js";
import { WebSearchAgent } from "./web-search.js";
import { VectorStoreAgent } from "./vector-store.js";
import fs from "fs";
import path from "path";

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
 * CoordinatorAgent - Orchestrates the smart contract generation process
 * 
 * This agent is responsible for coordinating the workflow between all specialized
 * agents to produce high-quality smart contracts from natural language requirements.
 */
export class CoordinatorAgent {
  private agent: Agent;
  private codeWriter: CodeWriterAgent;
  private securityAuditor: SecurityAuditAgent;
  private lintingAgent: LintingAgent;
  private functionalityChecker: FunctionalityAgent;
  private webSearchAgent: WebSearchAgent;
  private vectorStoreAgent: VectorStoreAgent;
  
  constructor(models: {
    coordinator?: string;
    codeWriter?: string;
    securityAuditor?: string;
    lintingAgent?: string;
    functionalityChecker?: string;
    webSearchAgent?: string;
    vectorStoreAgent?: string;
  } = {}) {
    this.agent = new Agent({
      name: "CoordinatorAgent",
      instructions:
        "You are the coordinator agent that orchestrates the smart contract generation process." +
        "You will follow this workflow:\n" +
        "1. Use WebSearchAgent to gather relevant information if needed\n" +
        "2. Use VectorStoreAgent to find relevant security patterns and examples\n" +
        "3. Use CodeWriter to generate initial Solidity code\n" +
        "4. Use SecurityAuditor to check for security issues\n" +
        "5. Use LintingAgent to improve code style and quality\n" +
        "6. Use FunctionalityChecker to verify the contract works as intended and generate tests if requested\n" +
        "Return the final contract with all improvements and security enhancements applied.",
      model: models.coordinator || "gpt-4o-mini",
    });
    
    this.codeWriter = new CodeWriterAgent(models.codeWriter);
    this.securityAuditor = new SecurityAuditAgent(models.securityAuditor);
    this.lintingAgent = new LintingAgent(models.lintingAgent);
    this.functionalityChecker = new FunctionalityAgent(models.functionalityChecker);
    this.webSearchAgent = new WebSearchAgent(models.webSearchAgent);
    this.vectorStoreAgent = new VectorStoreAgent(models.vectorStoreAgent);
  }
  
  /**
   * Generate a smart contract using the multi-agent system
   * 
   * @param prompt Contract requirements in natural language
   * @param options Generation options
   * @returns Generated contract, security notes, and optional tests
   */
  async generateContract(
    prompt: string,
    options: {
      search?: boolean;
      readDocs?: string;
      hardhat?: boolean;
      output?: string;
    } = {}
  ): Promise<{
    code: string;
    securityNotes: string;
    testCode?: string;
  }> {
    console.log("🚀 Coordinator Agent starting workflow for contract generation...");
    console.log("[CoordinatorAgent] Planning contract generation workflow");
    console.log("────────────────────────────────────────────");
    
    // Step 1: Web search (optional)
    let webSearchResults = "";
    if (options.search) {
      console.log("Running web search...");
      webSearchResults = await this.webSearchAgent.searchWeb(
        `solidity ${prompt} implementation examples`
      );
      console.log("✓ Web search completed");
    }
    
    // Step 2: Vector search for patterns
    let securityPatterns = "";
    if (options.readDocs) {
      console.log("Searching vector database for security patterns...");
      const patternSearchQuery = prompt.toLowerCase().includes("erc20") 
        ? "erc20 allowlist security" 
        : prompt.toLowerCase().includes("nft") 
          ? "nft security patterns"
          : "solidity security best practices";
      
      securityPatterns = await this.vectorStoreAgent.searchVectorStore(
        patternSearchQuery,
        options.readDocs || "security-patterns",
        3
      );
      console.log("✓ Vector search completed");
    }
    
    // Step 3: Code generation
    console.log("Generating initial smart contract code...");
    let context = webSearchResults + "\n\n" + securityPatterns;
    let initialCode = await this.codeWriter.generateCode(prompt, context);
    console.log("✓ Initial code generation completed");
    
    // Step 4: Security audit
    console.log("Performing security audit...");
    const auditResult = await this.securityAuditor.auditContract(initialCode, prompt);
    const securityIssues = auditResult.issues;
    let secureCode = auditResult.fixedCode;
    console.log("✓ Security audit completed");
    
    // Step 5: Linting and style improvements
    console.log("Improving code style and quality...");
    const lintResult = await this.lintingAgent.lintContract(secureCode);
    let lintedCode = lintResult.improvedCode;
    console.log("✓ Code style improvements completed");
    
    // Step 6: Functionality check and testing
    console.log("Verifying functionality and generating tests...");
    const functionalityResult = await this.functionalityChecker.verifyFunctionality(
      lintedCode,
      prompt,
      options.hardhat
    );
    const finalCode = functionalityResult.improvedCode;
    const testCode = functionalityResult.testCode;
    console.log("✓ Functionality verification completed");
    
    // Final console output
    console.log("────────────────────────────────────────────");
    console.log("\n✅ Agent Mode process completed successfully!");
    
    // Write the final output to file if specified
    if (finalCode && options.output) {
      try {
        // Save contract file
        if (safeWriteFileSync(options.output, finalCode)) {
          console.log(`\n✅ Contract saved to ${options.output}`);
        }
        
        // If hardhat tests were generated, save the test file too
        if (options.hardhat && testCode && options.output) {
          const contractName = options.output.replace(/\.sol$/, '');
          const testFilename = `${contractName}.test.js`;
          if (safeWriteFileSync(testFilename, testCode)) {
            console.log(`✅ Test file saved to ${testFilename}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error saving files:`, error);
      }
    }
    
    return {
      code: finalCode || "No code generated",
      securityNotes: securityIssues || "No security notes provided",
      testCode: testCode,
    };
  }
}

export const coordinatorSchema = {
  inputSchema: z.object({
    prompt: z.string().describe("Contract requirements"),
    options: z.object({
      search: z.boolean().optional().describe("Whether to perform web search"),
      readDocs: z.string().optional().describe("Vector DB collection to search"),
      hardhat: z.boolean().optional().describe("Whether to generate Hardhat tests"),
      output: z.string().optional().describe("Output file path"),
    }).optional(),
  }),
  outputSchema: z.object({
    code: z.string().describe("Generated Solidity code"),
    securityNotes: z.string().describe("Security considerations and notes"),
    testCode: z.string().optional().describe("Test code if requested"),
  })
}; 