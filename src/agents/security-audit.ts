import { Agent } from "../services/ai/mastra-shim";
import { z } from "zod";

/**
 * SecurityAuditAgent - Analyzes Solidity code for security vulnerabilities
 * 
 * This agent is responsible for checking generated smart contracts for 
 * potential security issues and suggesting improvements.
 */
export class SecurityAuditAgent {
  private agent: Agent;
  
  constructor(model: string = "claude-3-5-sonnet-20241022") {
    this.agent = new Agent({
      name: "SecurityAuditor",
      instructions:
        "You are a security auditor specializing in Solidity smart contracts." +
        "Analyze the provided code for security vulnerabilities including but not limited to:" +
        "- Reentrancy attacks\n" +
        "- Integer overflow/underflow\n" +
        "- Access control issues\n" +
        "- Logic errors\n" +
        "- Gas optimization issues\n" +
        "Provide detailed feedback on security issues and suggest specific code changes to fix them." +
        "Format your response as a list of issues with severity levels (Critical, High, Medium, Low) and recommended fixes.",
      model: model,
    });
  }
  
  /**
   * Audit a smart contract for security vulnerabilities
   * 
   * @param code The Solidity code to audit
   * @param requirements Original contract requirements
   * @returns Audit results with issues and fixed code
   */
  async auditContract(code: string, requirements: string): Promise<{
    issues: string;
    fixedCode: string;
  }> {
    console.log("Performing security audit...");
    console.log("[SecurityAuditor] Analyzing code for security vulnerabilities");
    
    // This is a placeholder implementation
    // In a real implementation, this would call the LLM
    
    // Sample security issues
    const securityIssues = `
SECURITY ISSUES:

## Medium: Missing Input Validation
- Function parameters should be validated to prevent unexpected behavior
- Add require statements to validate inputs

## Low: Gas Optimization
- Consider using uint256 instead of uint for better gas efficiency
- Use immutable for variables that are set in constructor but never change

## Informational: Event Indexing
- Consider indexing event parameters to improve filtering capabilities`;

    // Add a minor improvement to the code for demo purposes
    const improvedCode = code.replace(
      "function mint(address to, uint256 amount) external onlyMinter {",
      "function mint(address to, uint256 amount) external onlyMinter {\n        require(to != address(0), \"Cannot mint to zero address\");\n        require(amount > 0, \"Amount must be greater than zero\");"
    );
    
    return {
      issues: securityIssues,
      fixedCode: improvedCode,
    };
  }
}

export const securityAuditSchema = {
  inputSchema: z.object({
    code: z.string().describe("Solidity code to audit"),
    requirements: z.string().describe("Original requirements"),
  }),
  outputSchema: z.object({
    issues: z.string().describe("Security issues found"),
    fixedCode: z.string().describe("Fixed code with security improvements"),
  })
}; 