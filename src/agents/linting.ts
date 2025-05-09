import { Agent } from "../services/ai/mastra-shim";
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
    
    // This is a placeholder implementation
    // In a real implementation, this would call the LLM
    
    // For mock implementation, simulate finding some style issues
    const styleIssues = `
STYLE ISSUES:

1. Inconsistent spacing in function parameters
2. Missing NatSpec documentation for some functions
3. Consider using more descriptive variable names
4. Event parameters should be indexed for better filtering`;

    // Add some style improvements to the code
    let improvedCode = code;
    
    // Add missing documentation
    if (!improvedCode.includes("@notice")) {
      improvedCode = improvedCode.replace(
        /function (\w+)\(/g, 
        "/**\n     * @notice $1 function\n     */\n    function $1("
      );
    }
    
    return {
      issues: styleIssues,
      improvedCode: improvedCode,
    };
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