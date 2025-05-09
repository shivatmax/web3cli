import { Agent } from "../services/ai/mastra-shim";
import { z } from "zod";

/**
 * CodeWriterAgent - Translates natural language requirements into Solidity code
 * 
 * This agent is responsible for the initial generation of Solidity smart contracts
 * based on user requirements expressed in natural language.
 */
export class CodeWriterAgent {
  private agent: Agent;
  
  constructor(model: string = "gpt-4o-mini") {
    this.agent = new Agent({
      name: "CodeWriter",
      instructions: 
        "You are an expert Solidity developer who writes clean, secure smart contracts." +
        "Your task is to translate natural language requirements into well-structured Solidity code." +
        "Focus on implementing the core functionality while following security best practices." +
        "Always use the latest Solidity version (^0.8.20) unless specified otherwise." +
        "Include comprehensive NatSpec comments." +
        "Output only valid, compilable Solidity code without any additional text.",
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
    // Implementation would call the actual agent
    // This is a placeholder for the real implementation
    console.log("Generating initial smart contract code...");
    console.log(`[CodeWriter] Generating code for: ${prompt}`);
    
    // In real implementation, this would call the LLM
    // For now, return a placeholder
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Contract generated from: ${prompt}
 * @dev This is a placeholder implementation
 */
contract GeneratedContract is ERC20, Ownable {
    // TODO: Implement based on: ${prompt}
    
    constructor() ERC20("Token", "TKN") Ownable(msg.sender) {}
}`;
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