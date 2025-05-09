/**
 * AI SDK Utilities
 * 
 * This module provides utilities for working with different AI model providers.
 */
import OpenAI from "openai"
import { Config } from "../config/config"

/**
 * Get the SDK model based on the model ID
 * 
 * @param modelId The model ID
 * @param config Configuration object
 * @returns OpenAI client
 */
export async function getSDKModel(modelId: string, config: Config) {
  if (!config.openai_api_key) {
    throw new Error(
      "OpenAI API key not found. Set the OPENAI_API_KEY environment variable or configure it in the config file."
    )
  }

  const baseURL = config.openai_api_url || process.env.OPENAI_API_URL
  const openaiOptions: any = {
    apiKey: config.openai_api_key,
  }
  
  if (baseURL) {
    openaiOptions.baseURL = baseURL
  }
  
  return new OpenAI(openaiOptions)
} 