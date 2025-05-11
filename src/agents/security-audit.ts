import { Agent } from "../services/ai/mastra-shim.js";
import { z } from "zod";

/**
 * SecurityAuditAgent - Analyzes Solidity code for security vulnerabilities
 * 
 * This agent is responsible for checking generated smart contracts for 
 * potential security issues and suggesting improvements.
 */
export class SecurityAuditAgent {
  private agent: Agent;
  
  constructor(model: string = "gpt-4o-mini") {
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
    
    try {
      // Prepare input for the agent
      const input = {
        code: code,
        requirements: requirements
      };
      
      // Call the agent with the input
      const response = await this.agent.run(input);
      
      // Extract the security issues and fixed code from the response
      const issues = response.issues || "No security issues found.";
      const fixedCode = response.fixedCode || code;
      
      return {
        issues,
        fixedCode
      };
    } catch (error) {
      console.error("Error performing security audit:", error);
      
      // Return a fallback response in case of error
      return {
        issues: "Error occurred during security audit.",
        fixedCode: code
      };
    }
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