import { Agent } from "../services/ai/mastra-shim.js";
import { z } from "zod";

/**
 * LintingAgent - Improves code style and quality of Solidity contracts
 * 
 * This agent is responsible for checking code style, consistency, and 
 * adherence to best practices in Solidity smart contracts.
 */
export class LintingAgent {
  private agent: Agent;
  
  constructor(model: string = "gpt-4o-mini") {
    this.agent = new Agent({
      name: "LintingAgent",
      instructions:
        "You are a Solidity code style and quality expert." +
        "Review the code for style issues, consistency, and adherence to best practices." +
        "Check for:\n" +
        "- Proper naming conventions\n" +
        "- Code organization\n" +
        "- Gas optimizations\n" +
        "- Documentation completeness\n" +
        "Provide specific recommendations on how to improve the code quality.",
      model: model,
    });
  }
  
  /**
   * Lint a Solidity contract for style and quality issues
   * 
   * @param code The Solidity code to lint
   * @returns Linting results with issues and improved code
   */
  async lintContract(code: string): Promise<{
    issues: string;
    improvedCode: string;
  }> {
    console.log("Improving code style and quality...");
    console.log("[LintingAgent] Reviewing code style and quality");
    
    try {
      // Prepare input for the agent
      const input = {
        code: code
      };
      
      // Call the agent with the input
      const response = await this.agent.run(input);
      
      // Extract the issues and improved code from the response
      const issues = response.issues || "No style issues found.";
      const improvedCode = response.improvedCode || code;
      
      return {
        issues,
        improvedCode
      };
    } catch (error) {
      console.error("Error linting contract:", error);
      
      // Return a fallback response in case of error
      return {
        issues: "Error occurred during linting.",
        improvedCode: code
      };
    }
  }
}

export const lintingSchema = {
  inputSchema: z.object({
    code: z.string().describe("Solidity code to lint"),
  }),
  outputSchema: z.object({
    issues: z.string().describe("Style and quality issues"),
    improvedCode: z.string().describe("Improved code with better style"),
  })
}; 