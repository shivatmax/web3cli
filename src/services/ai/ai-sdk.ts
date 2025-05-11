/**
 * AI SDK Utilities
 * 
 * This module provides utilities for working with different AI model providers.
 */
import OpenAI from "openai"
import { getModelProvider, getRealModelId } from "./models.js"
import { Config, configDirPath } from "../config/config.js"
import path from "node:path"

import { GoogleGenerativeAI } from "@google/generative-ai"
import { Anthropic } from "@anthropic-ai/sdk"

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
      const localPath = path.join(process.cwd(), "web3cli.toml");
      const globalPath = path.join(configDirPath, "web3cli.toml");
      throw new Error(
        `${provider.charAt(0).toUpperCase() + provider.slice(1)} API key not configured. ` +
        `Please set the ${provider.toUpperCase()}_API_KEY environment variable, or add ${provider.toLowerCase()}_api_key ` +
        `to your web3cli.toml configuration file (${localPath} or ${globalPath}).`
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
    const localPath = path.join(process.cwd(), "web3cli.toml");
    const globalPath = path.join(configDirPath, "web3cli.toml");
    throw new Error(
      `OpenAI API key not found. Please set the OPENAI_API_KEY environment variable, ` +
      `or add openai_api_key to your web3cli.toml configuration file (${localPath} or ${globalPath}).`
    );
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
 * @returns Anthropic client
 */
function getAnthropicClient(config: Config) {
  if (!config.anthropic_api_key) {
    const localPath = path.join(process.cwd(), "web3cli.toml");
    const globalPath = path.join(configDirPath, "web3cli.toml");
    throw new Error(
      `Anthropic API key not found. Please set the ANTHROPIC_API_KEY environment variable, ` +
      `or add anthropic_api_key to your web3cli.toml configuration file (${localPath} or ${globalPath}).`
    );
  }
  
  const anthropic = new Anthropic({
    apiKey: config.anthropic_api_key,
  });
  
  // Return an adapter with OpenAI-like interface for Anthropic
  return {
    chat: {
      completions: {
        create: async ({ messages, stream = false, ...options }: any) => {
          try {
            // Convert OpenAI format to Anthropic format
            let systemPrompt = "";
            const anthropicMessages = messages.map((msg: any) => {
              if (msg.role === "system") {
                systemPrompt = msg.content;
                return null; // Will be filtered out below
              }
              return {
                role: msg.role === "assistant" ? "assistant" : "user",
                content: msg.content
              };
            }).filter(Boolean);

            if (stream) {
              const streamingResponse = await anthropic.beta.messages.create({
                model: options.model || "claude-3-5-sonnet-20240620",
                messages: anthropicMessages,
                system: systemPrompt,
                stream: true,
                max_tokens: options.max_tokens || 4096,
                temperature: options.temperature || 0,
              });
              
              // Create an AsyncIterable that mimics OpenAI's stream format
              return {
                [Symbol.asyncIterator]: async function*() {
                  for await (const chunk of streamingResponse) {
                    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                      yield {
                        choices: [{
                          delta: { content: chunk.delta.text }
                        }]
                      };
                    }
                  }
                }
              };
            } else {
              const response = await anthropic.beta.messages.create({
                model: options.model || "claude-3-5-sonnet-20240620",
                messages: anthropicMessages,
                system: systemPrompt,
                max_tokens: options.max_tokens || 4096,
                temperature: options.temperature || 0,
              });
              
              return {
                choices: [{
                  message: {
                    content: response.content[0].type === 'text' ? response.content[0].text : response.content[0]
                  }
                }]
              };
            }
          } catch (error) {
            console.error("Anthropic API error:", error);
            throw error;
          }
        }
      }
    }
  };
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
    const localPath = path.join(process.cwd(), "web3cli.toml");
    const globalPath = path.join(configDirPath, "web3cli.toml");
    throw new Error(
      `Gemini API key not found. Please set the GEMINI_API_KEY environment variable, ` +
      `or add gemini_api_key to your web3cli.toml configuration file (${localPath} or ${globalPath}).`
    );
  }

  // Initialize the Gemini API
  const genAI = new GoogleGenerativeAI(config.gemini_api_key);
  const model = genAI.getGenerativeModel({ model: modelName });

  // Return an adapter with OpenAI-like interface
  return {
    chat: {
      completions: {
        create: async ({ messages, stream = false }: any) => {
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
 * @returns Groq client (using OpenAI-compatible API)
 */
function getGroqClient(config: Config) {
  if (!config.groq_api_key) {
    const localPath = path.join(process.cwd(), "web3cli.toml");
    const globalPath = path.join(configDirPath, "web3cli.toml");
    throw new Error(
      `Groq API key not found. Please set the GROQ_API_KEY environment variable, ` +
      `or add groq_api_key to your web3cli.toml configuration file (${localPath} or ${globalPath}).`
    );
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
 * @returns Mistral client (using OpenAI-compatible API)
 */
function getMistralClient(config: Config) {
  if (!config.mistral_api_key) {
    const localPath = path.join(process.cwd(), "web3cli.toml");
    const globalPath = path.join(configDirPath, "web3cli.toml");
    throw new Error(
      `Mistral API key not found. Please set the MISTRAL_API_KEY environment variable, ` +
      `or add mistral_api_key to your web3cli.toml configuration file (${localPath} or ${globalPath}).`
    );
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
 * @returns Ollama client with OpenAI-compatible interface
 */
function getOllamaClient(config: Config) {
  const host = config.ollama_host || "http://localhost:11434";
  
  // Create an adapter with OpenAI-like interface for Ollama
  return {
    chat: {
      completions: {
        create: async ({ messages, stream = false, model: modelName, ...options }: any) => {
          try {
            // Convert OpenAI messages format to Ollama format
            const ollama_messages = messages.map((msg: any) => {
              // Ollama doesn't support system messages directly,
              // so convert to a user message if needed
              return {
                role: msg.role === "system" ? "user" : msg.role,
                content: msg.content
              };
            });
            
            // Extract model from the real model ID if provided
            const modelToUse = modelName || "llama3";
            
            if (stream) {
              // Initialize fetch for streaming response
              const response = await fetch(`${host}/api/chat`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: modelToUse,
                  messages: ollama_messages,
                  stream: true,
                  options: {
                    temperature: options.temperature || 0,
                  },
                }),
              });
              
              if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
              }
              
              if (!response.body) {
                throw new Error('Ollama response body is null');
              }
              
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              
              // Create an AsyncIterable that mimics OpenAI's stream format
              return {
                [Symbol.asyncIterator]: async function*() {
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    // Ollama sends JSON objects, each on a new line
                    const lines = chunk.split('\n').filter(Boolean);
                    
                    for (const line of lines) {
                      try {
                        const data = JSON.parse(line);
                        if (data.message?.content) {
                          yield {
                            choices: [{
                              delta: { content: data.message.content }
                            }]
                          };
                        }
                      } catch (e) {
                        console.warn('Failed to parse Ollama chunk:', line);
                      }
                    }
                  }
                }
              };
            } else {
              // Non-streaming request
              const response = await fetch(`${host}/api/chat`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: modelToUse,
                  messages: ollama_messages,
                  options: {
                    temperature: options.temperature || 0,
                  },
                }),
              });
              
              if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
              }
              
              const data = await response.json();
              
              return {
                choices: [{
                  message: {
                    content: data.message?.content || "No content returned from Ollama"
                  }
                }]
              };
            }
          } catch (error) {
            console.error("Ollama API error:", error);
            throw error;
          }
        }
      }
    }
  };
} 