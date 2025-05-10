/**
 * AI Models Management
 * 
 * This module provides utilities for managing AI models from different providers.
 */

export const MODEL_PREFIXES = {
  ANTHROPIC: "claude-",
  OPENAI: "gpt-",
  OPENAI_O: "openai-o",
  GEMINI: "gemini-",
  GROQ: "groq-",
  MISTRAL: "mistral-",
  COPILOT: "copilot-",
  OLLAMA: "ollama-"
}

export const AVAILABLE_MODELS = [
  // OpenAI models
  { id: "gpt-4o-mini", realId: "gpt-4o-mini" },
  { id: "gpt-4o", realId: "gpt-4o" },
  { id: "gpt-4.1", realId: "gpt-4.1" },
  { id: "gpt-4.1-mini", realId: "gpt-4.1-mini" },
  { id: "gpt-4.1-nano", realId: "gpt-4.1-nano" },
  { id: "gpt-3.5-turbo", realId: "gpt-3.5-turbo" },
  // OpenAI "o" models
  { id: "openai-o1", realId: "o1" },
  { id: "openai-o1-mini", realId: "o1-mini" },
  { id: "openai-o1-preview", realId: "o1-preview" },
  { id: "openai-o3-mini", realId: "o3-mini" },
  { id: "openai-o3", realId: "o3" },
  { id: "openai-o4-mini", realId: "o4-mini" },
  // Claude models
  { id: "claude-3-7-sonnet", realId: "claude-3-7-sonnet-20240307" },
  { id: "claude-3-5-sonnet", realId: "claude-3-5-sonnet-20240620" },
  { id: "claude-3-5-haiku", realId: "claude-3-5-haiku-20240307" },
  { id: "claude-3-opus", realId: "claude-3-opus-20240229" },
  // Gemini models
  { id: "gemini-2.5-flash", realId: "gemini-2.5-flash-preview-04-17" },
  { id: "gemini-2.5-pro", realId: "gemini-2.5-pro-preview-05-06" },
  { id: "gemini-2.0-flash", realId: "gemini-2.0-flash" },
  { id: "gemini-2.0-flash-lite", realId: "gemini-2.0-flash-lite" },
  { id: "gemini-1.5-flash", realId: "gemini-1.5-flash-latest" },
  { id: "gemini-1.5-pro", realId: "gemini-1.5-pro-latest" },
  // Groq models
  { id: "groq-llama-3.3-70b", realId: "llama-3.3-70b-versatile" },
  { id: "groq-llama-3.1-8b", realId: "llama-3.1-8b-instant" },
  { id: "groq-mixtral-8x7b", realId: "mixtral-8x7b-32768" },
  // Mistral models
  { id: "mistral-large", realId: "mistral-large-latest" },
  { id: "mistral-medium", realId: "mistral-medium-latest" },
  { id: "mistral-small", realId: "mistral-small-latest" },
  // GitHub Copilot models
  { id: "copilot-gpt-4o", realId: "gpt-4o" },
  { id: "copilot-o1-mini", realId: "o1-mini" },
  { id: "copilot-o1-preview", realId: "o1-preview" },
  { id: "copilot-claude-3.5-sonnet", realId: "claude-3.5-sonnet" },
]

/**
 * Get all available models
 * 
 * @param includeAll Whether to include all models or just the main ones
 * @param includeOllama Whether to include Ollama local models
 * @returns Array of model objects
 */
export async function getAllModels(includeAll = false, includeOllama = false) {
  let models = [...AVAILABLE_MODELS];
  
  if (includeOllama) {
    try {
      // In a real implementation, this would fetch Ollama models
      // For now, just add a sample Ollama model
      models.push({ id: "ollama-llama3", realId: "llama3" });
    } catch (error) {
      console.warn("Failed to fetch Ollama models:", error);
    }
  }
  
  return models;
}

/**
 * Get a cheaper model ID based on a model ID
 * 
 * @param modelId The model ID
 * @returns A cheaper model ID
 */
export function getCheapModelId(modelId: string) {
  if (modelId.startsWith(MODEL_PREFIXES.ANTHROPIC)) {
    return "claude-3-5-haiku";
  }
  
  if (modelId.startsWith(MODEL_PREFIXES.GEMINI)) {
    return "gemini-1.5-flash";
  }
  
  if (modelId.startsWith(MODEL_PREFIXES.GROQ)) {
    return "groq-llama-3.1-8b";
  }
  
  if (modelId.startsWith(MODEL_PREFIXES.MISTRAL)) {
    return "mistral-small";
  }
  
  if (modelId.startsWith(MODEL_PREFIXES.COPILOT)) {
    return "copilot-o1-mini";
  }
  
  if (modelId.startsWith(MODEL_PREFIXES.OPENAI_O)) {
    return "openai-o1-mini";
  }
  
  return "gpt-4o-mini";
}

/**
 * Get the provider name from a model ID
 * 
 * @param modelId The model ID
 * @returns The provider name
 */
export function getModelProvider(modelId: string) {
  if (modelId.startsWith(MODEL_PREFIXES.ANTHROPIC)) {
    return "anthropic";
  }
  
  if (modelId.startsWith(MODEL_PREFIXES.GEMINI)) {
    return "gemini";
  }
  
  if (modelId.startsWith(MODEL_PREFIXES.GROQ)) {
    return "groq";
  }
  
  if (modelId.startsWith(MODEL_PREFIXES.MISTRAL)) {
    return "mistral";
  }
  
  if (modelId.startsWith(MODEL_PREFIXES.COPILOT)) {
    return "copilot";
  }
  
  if (modelId.startsWith(MODEL_PREFIXES.OLLAMA)) {
    return "ollama";
  }
  
  // Default to OpenAI for both gpt- and openai-o prefixes
  return "openai";
}

/**
 * Get the real model ID that should be used with the provider's API
 * 
 * @param modelId The model ID used in our system
 * @returns The real model ID to use with the provider's API
 */
export function getRealModelId(modelId: string) {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  return model?.realId || modelId;
} 