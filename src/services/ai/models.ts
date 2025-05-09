/**
 * AI Models Management
 * 
 * This module provides utilities for managing AI models from different providers.
 */

export const MODEL_PREFIXES = {
  ANTHROPIC: "claude-",
  OPENAI: "gpt-",
}

export const AVAILABLE_MODELS = [
  { id: "gpt-4o-mini", realId: "gpt-4o-mini" },
  { id: "gpt-4o-mini", realId: "gpt-4o-mini" },
  { id: "gpt-4", realId: "gpt-4-turbo-preview" },
  { id: "gpt-3.5", realId: "gpt-3.5-turbo" },
  { id: "claude-3-5-sonnet", realId: "claude-3-5-sonnet-20241022" },
  { id: "claude-3-opus", realId: "claude-3-opus-20240229" },
  { id: "claude-3-sonnet", realId: "claude-3-sonnet-20240229" },
  { id: "claude-3-haiku", realId: "claude-3-haiku-20240307" },
]

/**
 * Get all available models
 * 
 * @param includeAll Whether to include all models or just the main ones
 * @returns Array of model objects
 */
export async function getAllModels(includeAll = false) {
  return AVAILABLE_MODELS
}

/**
 * Get a cheaper model ID based on a model ID
 * 
 * @param modelId The model ID
 * @returns A cheaper model ID
 */
export function getCheapModelId(modelId: string) {
  if (modelId.startsWith(MODEL_PREFIXES.ANTHROPIC)) {
    return "claude-3-haiku-20240307"
  }
  return "gpt-3.5-turbo"
} 