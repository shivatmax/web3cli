/**
 * Mastra AI Framework Integration
 * 
 * This module provides integration with the Mastra AI agent framework,
 * exposing interfaces for creating and managing AI agents.
 */
import { getSDKModel } from "./ai-sdk.js";
import { loadConfig } from "../config/config.js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

/**
 * Agent configuration options
 */
export interface AgentConfig {
  name: string;
  instructions: string;
  model: string;
  tools?: Record<string, any>;
}

/**
 * Agent class for AI-based agents
 */
export class Agent {
  name: string;
  instructions: string;
  model: string;
  tools: Record<string, any>;
  
  constructor(config: AgentConfig) {
    this.name = config.name;
    this.instructions = config.instructions;
    this.model = config.model;
    this.tools = config.tools || {};
  }
  
  /**
   * Run the agent with the given input
   * 
   * @param input Input for the agent
   * @returns Agent output
   */
  async run(input: any): Promise<any> {
    console.log(`[${this.name}] Running with model: ${this.model}`);
    
    try {
      const config = loadConfig();
      const openai = await getSDKModel(this.model, config);
      
      // Create system and user messages
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: this.instructions
        },
        {
          role: "user",
          content: typeof input === 'string' ? input : JSON.stringify(input, null, 2)
        }
      ];
      
      // Call the OpenAI API
      const completion = await openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.2, // Lower temperature for more focused outputs
      });
      
      // Get the generated content
      const content = completion.choices?.[0]?.message?.content || '';
      
      // Try to parse content as JSON if it seems to be JSON
      if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
        try {
          return JSON.parse(content);
        } catch (error) {
          // If parsing fails, return the content as output
          return { output: content };
        }
      }
      
      // Default to returning content as output
      return { output: content };
    } catch (error) {
      console.error(`[${this.name}] Error during execution:`, error);
      // Return a minimal response in case of error
      return { 
        output: `Error occurred: ${error}`,
        error: true
      };
    }
  }
}

/**
 * Mastra framework for orchestrating agents
 */
export class Mastra {
  agents: Record<string, Agent>;
  
  constructor(config: { agents: Record<string, Agent> }) {
    this.agents = config.agents;
  }
  
  /**
   * Get an agent by name
   * 
   * @param name Agent name
   * @returns The agent instance
   */
  getAgent(name: string): Agent {
    return this.agents[name];
  }
}

/**
 * Create a tool for agent use
 * 
 * @param config Tool configuration
 * @returns Tool definition
 */
export function createTool(config: any): any {
  return { ...config };
}

/**
 * Create a vector query tool
 * 
 * @param config Vector query tool configuration
 * @returns Vector query tool
 */
export function createVectorQueryTool(config: any): any {
  return { ...config, type: 'vector_query' };
}

/**
 * OpenAI model provider
 * 
 * @param model Model name
 * @returns Model identifier
 */
export function openai(model: string): string {
  return `openai:${model}`;
}

/**
 * Anthropic model provider
 * 
 * @param model Model name
 * @returns Model identifier
 */
export function anthropic(model: string): string {
  return `anthropic:${model}`;
} 

/**
 * Gemini model provider
 * 
 * @param model Model name
 * @returns Model identifier
 */
export function gemini(model: string): string {
  return `gemini:${model}`;
}

/**
 * Groq model provider
 * 
 * @param model Model name
 * @returns Model identifier
 */
export function groq(model: string): string {
  return `groq:${model}`;
}

/**
 * Mistral model provider
 * 
 * @param model Model name
 * @returns Model identifier
 */
export function mistral(model: string): string {
  return `mistral:${model}`;
}

/**
 * GitHub Copilot model provider
 * 
 * @param model Model name
 * @returns Model identifier
 */
export function copilot(model: string): string {
  return `copilot:${model}`;
}

/**
 * Ollama model provider
 * 
 * @param model Model name
 * @returns Model identifier
 */
export function ollama(model: string): string {
  return `ollama:${model}`;
}
