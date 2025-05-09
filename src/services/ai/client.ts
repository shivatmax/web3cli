/**
 * AI Client Service
 * 
 * This module provides a unified interface for interacting with AI models
 * from different providers (OpenAI, Anthropic, etc.)
 */
import { openai, anthropic } from './mastra-shim';
import { loadConfig } from '../config/config';

/**
 * Result from an AI generation
 */
export interface AIResult {
  text: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Options for AI generation
 */
export interface AIOptions {
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

/**
 * AI Client interface
 */
export interface AIClient {
  generate(prompt: string, options?: AIOptions): Promise<AIResult>;
  generateStream?(prompt: string, options?: AIOptions): AsyncIterable<AIResult>;
}

/**
 * Default AI Client implementation
 */
class DefaultAIClient implements AIClient {
  private model: string;
  
  constructor(model: string) {
    this.model = model;
  }
  
  /**
   * Generate text from a prompt
   * 
   * @param prompt The prompt to generate from
   * @param options Generation options
   * @returns Generated text and metadata
   */
  async generate(prompt: string, options: AIOptions = {}): Promise<AIResult> {
    console.log(`Generating with model: ${this.model}`);
    
    // This is a stub implementation
    // In a real implementation, this would call the actual AI API
    
    return {
      text: `This is a stub response for: "${prompt}"`,
      finishReason: "stop",
      usage: {
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
      },
    };
  }
}

/**
 * Get an AI client for the specified model
 * 
 * @param modelOverride Override the model from config
 * @returns AI client
 */
export function getAIClient(modelOverride?: string): AIClient {
  const config = loadConfig();
  const modelName = modelOverride || config.default_model || "gpt-4o-mini";
  
  // Determine provider based on model name
  const clientModel = modelName.startsWith("claude") 
    ? anthropic(modelName)
    : openai(modelName);
  
  return new DefaultAIClient(clientModel);
} 