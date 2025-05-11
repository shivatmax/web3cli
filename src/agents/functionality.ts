import { Agent } from "../services/ai/mastra-shim.js";
import { z } from "zod";

/**
 * FunctionalityAgent - Verifies contract functionality against requirements
 * 
 * This agent is responsible for checking that the generated smart contract
 * implements all the required functionality correctly and can generate tests.
 */
export class FunctionalityAgent {
  private agent: Agent;
  
  constructor(model: string = "gpt-4o-mini") {
    this.agent = new Agent({
      name: "FunctionalityChecker",
      instructions:
        "You are an expert in testing and verifying Solidity smart contracts." +
        "Analyze the provided code to ensure it meets the specified requirements." +
        "Check for edge cases and potential logical errors." +
        "If requested, create appropriate test cases using Hardhat." +
        "Suggest improvements to enhance the contract's functionality.",
      model: model,
    });
  }
  
  /**
   * Verify contract functionality against requirements
   * 
   * @param code The Solidity code to check
   * @param requirements Original contract requirements
   * @param generateTests Whether to generate test cases
   * @returns Verification results with feedback, improved code, and optional tests
   */
  async verifyFunctionality(
    code: string, 
    requirements: string, 
    generateTests: boolean = false
  ): Promise<{
    feedback: string;
    improvedCode: string;
    testCode?: string;
  }> {
    console.log("Verifying functionality and generating tests...");
    console.log("[FunctionalityChecker] Verifying implementation against requirements");
    
    try {
      // Prepare input for the agent
      const input = {
        code: code,
        requirements: requirements,
        generateTests: generateTests
      };
      
      // Call the agent with the input
      const response = await this.agent.run(input);
      
      // Extract the feedback, improved code, and test code from the response
      return {
        feedback: response.feedback || "No functionality feedback provided.",
        improvedCode: response.improvedCode || code,
        testCode: generateTests ? response.testCode : undefined
      };
    } catch (error) {
      console.error("Error verifying functionality:", error);
      
      // Extract the contract name for error test generation if needed
      const contractNameMatch = code.match(/contract\s+(\w+)/);
      const contractName = contractNameMatch ? contractNameMatch[1] : "Contract";
      
      // Return a fallback response in case of error
      return {
        feedback: "Error occurred during functionality verification.",
        improvedCode: code,
        testCode: generateTests ? 
          `// Error generating tests for ${contractName}\n` +
          `// Please manually create tests based on the contract requirements.` : 
          undefined
      };
    }
  }
}

export const functionalitySchema = {
  inputSchema: z.object({
    code: z.string().describe("Solidity code to check"),
    requirements: z.string().describe("Original requirements"),
    generateTests: z.boolean().optional().describe("Whether to generate tests"),
  }),
  outputSchema: z.object({
    feedback: z.string().describe("Functionality feedback"),
    improvedCode: z.string().describe("Code with functional improvements"),
    testCode: z.string().optional().describe("Test code if requested"),
  })
}; 