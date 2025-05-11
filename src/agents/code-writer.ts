import { Agent } from "../services/ai/mastra-shim.js";
import { z } from "zod";

/**
 * CodeWriterAgent - Translates natural language requirements into Solidity code
 * 
 * This agent is responsible for the initial generation of Solidity smart contracts
 * based on user requirements expressed in natural language.
 */
export class CodeWriterAgent {
  agent: Agent;
  
  constructor(model: string = "gpt-4o-mini") {
    this.agent = new Agent({
      name: "CodeWriter",
      instructions: 
        "You are an expert Solidity developer who writes clean, secure smart contracts." +
        "Your task is to translate natural language requirements into well-structured Solidity code." +
        "Focus on implementing the core functionality while following security best practices." +
        "Always use the latest Solidity version (^0.8.20) unless specified otherwise." +
        "Include comprehensive NatSpec comments." +
        "\n\n" +
        "IMPORTANT FORMATTING INSTRUCTIONS:\n" +
        "1. Start your response with '```solidity' and end with '```'\n" +
        "2. Include ONLY valid Solidity code within these markers\n" + 
        "3. Always begin with SPDX license identifier and pragma statement\n" +
        "4. Write complete, compilable contracts\n" +
        "5. DO NOT include explanations before or after the code block\n" +
        "6. Make sure code follows best security practices\n" +
        "7. If an upgradeable contract is requested, use OpenZeppelin's upgradeable contracts library properly",
      model: model,
    });
  }
  
  /**
   * Generate Solidity code based on the given requirements
   * 
   * @param prompt Natural language description of the contract requirements
   * @param context Additional context (optional)
   * @returns The generated Solidity code
   */
  async generateCode(prompt: string, context?: string): Promise<string> {
    console.log("Generating initial smart contract code...");
    console.log(`[CodeWriter] Generating code for: ${prompt}`);
    
    try {
      // Prepare input for the agent
      const input = {
        prompt: prompt,
        context: context || "",
        format: "solidity",
        requirements: [
          "Create complete, compilable Solidity code",
          "Include proper SPDX license and pragma statement",
          "Implement security best practices",
          "Generate NatSpec documentation",
          "Return ONLY code within ```solidity code blocks",
        ]
      };
      
      // Call the agent with the input
      const response = await this.agent.run(input);
      
      // Extract the code from the response
      let output = response.output || "";
      
      // Ensure proper code block formatting if not already present
      if (!output.trim().startsWith("```solidity") && !output.trim().startsWith("```")) {
        output = "```solidity\n" + output + "\n```";
      }
      
      return output;
    } catch (error) {
      console.error("Error generating code:", error);
      // Fall back to a simple template in case of error
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Contract based on: ${prompt}
 * @notice Error occurred during generation
 */
contract GeneratedContract {
    // Error occurred during generation
}`; 
    }
  }
}

export const codeWriterSchema = {
  inputSchema: z.object({
    prompt: z.string().describe("Contract requirements"),
    context: z.string().optional().describe("Additional context"),
  }),
  outputSchema: z.object({
    code: z.string().describe("Generated Solidity code"),
  })
}; 