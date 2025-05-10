/**
 * AI SDK Utilities
 * 
 * This module provides utilities for working with different AI model providers.
 */
import OpenAI from "openai"
import { getModelProvider, getRealModelId } from "./models"
import { Config } from "../config/config"

// Import Gemini API (this will need to be installed)
// Placeholder for actual Gemini SDK 
// npm install @google/generative-ai
import { GoogleGenerativeAI } from "@google/generative-ai"

/**
 * Get the SDK model based on the model ID
 * 
 * @param modelId The model ID
 * @param config Configuration object
 * @returns Model client
 */
export async function getSDKModel(modelId: string, config: Config) {
  const provider = getModelProvider(modelId);
  const realModelId = getRealModelId(modelId);
  
  try {
    switch (provider) {
      case "anthropic":
        return getAnthropicClient(config);
      case "gemini":
        return getGeminiClient(config, realModelId);
      case "groq":
        return getGroqClient(config);
      case "mistral":
        return getMistralClient(config);
      case "copilot":
        return getCopilotClient(config);
      case "ollama":
        return getOllamaClient(config);
      case "openai":
      default:
        return getOpenAIClient(config);
    }
  } catch (error) {
    const e = error as Error;
    if (e.message.includes("API key not found")) {
      throw new Error(
        `${provider.charAt(0).toUpperCase() + provider.slice(1)} API key not configured. Please set the ${provider.toUpperCase()}_API_KEY in your environment variables or config file.`
      );
    }
    throw error;
  }
}

/**
 * Get OpenAI client
 * 
 * @param config Configuration object
 * @returns OpenAI client
 */
function getOpenAIClient(config: Config) {
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

/**
 * Get Anthropic client
 * 
 * @param config Configuration object
 * @returns Anthropic client (or OpenAI as fallback for now)
 */
function getAnthropicClient(config: Config) {
  // For now, use OpenAI client as a stub
  // In a real implementation, this would return an Anthropic client
  if (!config.anthropic_api_key) {
    throw new Error(
      "Anthropic API key not found. Set the ANTHROPIC_API_KEY environment variable or configure it in the config file."
    )
  }
  
  console.warn("Using OpenAI as a fallback for Anthropic models - install Anthropic SDK for proper support")
  return getOpenAIClient(config);
}

/**
 * Get Gemini client
 * 
 * @param config Configuration object
 * @param modelName The actual model name to use
 * @returns Gemini client with chat interface similar to OpenAI
 */
function getGeminiClient(config: Config, modelName: string) {
  if (!config.gemini_api_key) {
    throw new Error(
      "Gemini API key not found. Set the GEMINI_API_KEY environment variable or configure it in the config file."
    )
  }

  // Initialize the Gemini API
  const genAI = new GoogleGenerativeAI(config.gemini_api_key);
  const model = genAI.getGenerativeModel({ model: modelName });

  // Return an adapter with OpenAI-like interface
  return {
    chat: {
      completions: {
        create: async ({ messages, stream = false, ...options }: any) => {
          // Convert OpenAI-style messages to Gemini format
          const prompt = messages.map((msg: any) => {
            if (msg.role === "system") {
              return { role: "user", parts: [{ text: msg.content }] };
            }
            return { 
              role: msg.role === "assistant" ? "model" : "user", 
              parts: [{ text: msg.content }] 
            };
          });

          try {
            if (stream) {
              const streamingResponse = await model.generateContentStream({ contents: prompt });
              
              // Create an AsyncIterable that mimics OpenAI's stream format
              return {
                [Symbol.asyncIterator]: async function*() {
                  for await (const chunk of streamingResponse.stream) {
                    const text = chunk.text();
                    yield {
                      choices: [{
                        delta: { content: text }
                      }]
                    };
                  }
                }
              };
            } else {
              const response = await model.generateContent({ contents: prompt });
              return {
                choices: [{
                  message: {
                    content: response.response.text()
                  }
                }]
              };
            }
          } catch (error) {
            console.error("Gemini API error:", error);
            throw error;
          }
        }
      }
    }
  };
}

/**
 * Get Groq client
 * 
 * @param config Configuration object
 * @returns Groq client (or OpenAI as fallback for now)
 */
function getGroqClient(config: Config) {
  if (!config.groq_api_key) {
    throw new Error(
      "Groq API key not found. Set the GROQ_API_KEY environment variable or configure it in the config file."
    )
  }
  
  // Groq uses the OpenAI-compatible API
  const baseURL = config.groq_api_url || "https://api.groq.com/openai/v1";
  return new OpenAI({
    apiKey: config.groq_api_key,
    baseURL: baseURL
  });
}

/**
 * Get Mistral client
 * 
 * @param config Configuration object
 * @returns Mistral client (or OpenAI as fallback for now)
 */
function getMistralClient(config: Config) {
  if (!config.mistral_api_key) {
    throw new Error(
      "Mistral API key not found. Set the MISTRAL_API_KEY environment variable or configure it in the config file."
    )
  }
  
  // Mistral uses the OpenAI-compatible API
  const baseURL = config.mistral_api_url || "https://api.mistral.ai/v1";
  return new OpenAI({
    apiKey: config.mistral_api_key,
    baseURL: baseURL
  });
}

/**
 * Get GitHub Copilot client
 * 
 * @param config Configuration object
 * @returns Copilot client (or OpenAI as fallback for now)
 */
function getCopilotClient(config: Config) {
  // For now, use OpenAI client as a stub
  // In a real implementation, this would return a Copilot client
  console.warn("Using OpenAI as a fallback for Copilot models - proper Copilot API access not implemented")
  return getOpenAIClient(config);
}

/**
 * Get Ollama client
 * 
 * @param config Configuration object
 * @returns Ollama client (or OpenAI as fallback for now)
 */
function getOllamaClient(config: Config) {
  const host = config.ollama_host || "http://localhost:11434";
  console.warn(`Using Ollama at ${host} - make sure Ollama is running`)
  
  // Create an adapter with OpenAI-like interface for Ollama
  return {
    chat: {
      completions: {
        create: async ({ messages, stream = false, model: modelName, ...options }: any) => {
          // For now, return a placeholder implementation
          console.warn("Ollama support not fully implemented - returning placeholder response")
          
          if (stream) {
            return {
              [Symbol.asyncIterator]: async function*() {
                yield {
                  choices: [{
                    delta: { content: "This is a placeholder response from Ollama. " }
                  }]
                };
                yield {
                  choices: [{
                    delta: { content: "Proper Ollama integration needs to be implemented." }
                  }]
                };
              }
            };
          } else {
            return {
              choices: [{
                message: {
                  content: "This is a placeholder response from Ollama. Proper Ollama integration needs to be implemented."
                }
              }]
            };
          }
        }
      }
    }
  };
} 