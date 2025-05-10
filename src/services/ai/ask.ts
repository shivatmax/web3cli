/**
 * Ask Service
 * 
 * This module provides functionality for asking questions to AI models.
 */
import process from "node:process"
import { CoreMessage } from "ai"
import { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import { loadFiles, notEmpty } from "../../utils/common"
import { loadConfig } from "../config/config"
import {
  MODEL_PREFIXES,
  getAllModels,
  getCheapModelId,
  getModelProvider
} from "./models"
import cliPrompts from "prompts"
import { stdin, readPipeInput } from "../../utils/tty"
import { CliError } from "../../utils/error"
import { getSDKModel } from "./ai-sdk"
import { fetchUrl } from "../../utils/fetch-url"
import logUpdate from "log-update"
import { renderMarkdown } from "../../utils/markdown"
import { VectorDB } from "../vector-db/vector-db"
import { processVectorDBReadRequest, augmentMessagesWithRAG } from "./rag-utils"

// Function to replace debug module
const debug = (...args: any[]) => {
  if (process.env.DEBUG !== "shell-ask" && process.env.DEBUG !== "*") return
  console.log(...args)
}

/**
 * Ask a question to an AI model
 * 
 * @param prompt The question prompt
 * @param options Options for the question
 */
export async function ask(
  prompt: string | undefined,
  options: {
    model?: string | boolean
    command?: boolean
    pipeInput?: string
    files?: string | string[]
    type?: string
    url?: string | string[]
    search?: boolean
    stream?: boolean
    breakdown?: boolean
    readDocs?: string
    [key: string]: any
  }
) {
  if (!prompt) {
    throw new CliError("please provide a prompt")
  }

  const config = loadConfig()
  let modelId =
    options.model === true
      ? "select"
      : options.model ||
        config.default_model ||
        "gpt-4o-mini"

  // Include Ollama models when explicitly requested or when selecting from all models
  const includeOllama = modelId === "select" || modelId.startsWith("ollama-");
  
  const models = await getAllModels(
    modelId === "select" ? true : false,
    includeOllama
  )

  if (modelId === "select") {
    if (process.platform === "win32" && !process.stdin.isTTY) {
      throw new CliError(
        "Interactively selecting a model is not supported on Windows when using piped input. Consider directly specifying the model id instead, for example: `-m gpt-4o`"
      )
    }

    const result = await cliPrompts([
      {
        stdin,

        type: "autocomplete",

        message: "Select a model",

        name: "modelId",

        async suggest(input, choices) {
          return choices.filter((choice) => {
            return choice.title.toLowerCase().includes(input)
          })
        },

        choices: models
          .filter(
            (item) => modelId === "select" || item.id.startsWith(`${modelId}-`)
          )
          .map((item) => {
            return {
              value: item.id,
              title: item.id,
            }
          }),
      },
    ])

    if (typeof result.modelId !== "string" || !result.modelId) {
      throw new CliError("no model selected")
    }

    modelId = result.modelId
  }

  debug(`Selected modelID: ${modelId}`)

  const matchedModel = models.find(
    (m) => m.id === modelId || m.realId === modelId
  )
  if (!matchedModel) {
    // Get a list of models by prefix to suggest alternatives
    const modelPrefix = modelId.split('-')[0];
    const similarModels = models
      .filter(m => m.id.startsWith(`${modelPrefix}-`))
      .map(m => m.id);
    
    let errorMessage = `Model not found: ${modelId}\n\n`;
    
    if (similarModels.length > 0) {
      errorMessage += `Did you mean one of these models?\n${similarModels.join('\n')}\n\n`;
    }
    
    errorMessage += `Available models: ${models.map((m) => m.id).join(', ')}`;
    
    throw new CliError(errorMessage);
  }
  const realModelId = matchedModel.realId || modelId
  const openai = await getSDKModel(modelId, config)

  debug("model", realModelId)

  const files = await loadFiles(options.files || [])
  const remoteContents = await fetchUrl(options.url || [])

  // Handle vector DB docs
  let docsContext: string[] = []
  if (options.readDocs) {
    try {
      // Get relevant content from the vector DB using our new utility
      const docsContent = await processVectorDBReadRequest(prompt, options.readDocs, 8)
      if (docsContent) {
        docsContext = [
          `docs:${options.readDocs}:`,
          `"""
${docsContent}
"""`
        ]
      }
    } catch (e) {
      // ignore if vector db fails
      console.warn("Warning: Failed to retrieve docs from vector DB", e)
    }
  }

  const context = [
    `platform: ${process.platform}\nshell: ${process.env.SHELL || "unknown"}`,

    options.pipeInput && [`stdin:`, "```", options.pipeInput, "```"].join("\n"),

    files.length > 0 && "files:",
    ...files.map((file) => `${file.name}:\n"""\n${file.content}\n"""`),

    remoteContents.length > 0 && "remote contents:",
    ...remoteContents.map(
      (content) => `${content.url}:
"""
${content.content}
"""`
    ),
    ...docsContext,
  ]
    .filter(notEmpty)
    .join("\n")

  let searchResult: string | undefined

  if (options.search) {
    // Skip search for now as it depends on SDK compatibility
    console.log("Web search is not currently available")
  }

  const messages: CoreMessage[] = []

  const systemMessage = `You are a Web3 development expert specializing in blockchain technologies, smart contracts, and decentralized applications. You provide accurate, helpful information about Solidity, Ethereum, and related technologies.`

  const userMessage = [
    searchResult && `SEARCH RESULTS:\n${searchResult}`,
    context && `CONTEXT:\n${context}`,
    `QUESTION: ${prompt}`,
  ]
    .filter(Boolean)
    .join("\n\n")

  try {
    let content = ""
    
    // Prepare base messages for OpenAI
    let messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemMessage,
      },
      {
        role: "user",
        content: userMessage,
      }
    ]
    
    // Augment with RAG if readDocs is provided
    if (options.readDocs) {
      console.log(`Using RAG with collection: ${options.readDocs}`);
      
      try {
        // Get relevant content directly rather than using the augmentation utility
        const docsContent = await processVectorDBReadRequest(prompt, options.readDocs, 5);
        
        if (docsContent) {
          // Add the content to the user message
          messages[1] = {
            role: "user",
            content: `${userMessage}\n\nHere's some relevant information to help you answer:\n\n${docsContent}`
          };
          console.log("✅ Context from vector database added to prompt");
        }
      } catch (error) {
        console.warn("Warning: Failed to augment messages with RAG", error);
      }
    }
    
    const provider = getModelProvider(modelId);
    console.log(`Using ${provider.toUpperCase()} provider with model: ${realModelId}`);
    
    if (options.stream !== false) {
      try {
        const stream = await openai.chat.completions.create({
          model: realModelId,
          messages,
          stream: true,
        });

        // Type assertion to ensure the stream has the async iterator
        const streamWithIterator = stream as AsyncIterable<any>;
        
        for await (const chunk of streamWithIterator) {
          const content_chunk = chunk.choices?.[0]?.delta?.content || "";
          content += content_chunk;
          logUpdate(renderMarkdown(content));
        }

        logUpdate.done();
      } catch (error: any) {
        logUpdate.clear();
        
        if (error.message && error.message.includes("does not exist")) {
          console.error(`Error: Model '${realModelId}' not found or not available with the ${provider} provider.`);
          console.error(`\nMake sure you've configured the API key for ${provider} and are using a valid model.`);
          console.error(`To see all available models, run: web3cli list`);
        } else {
          console.error("Error during streaming request:", error.message || error);
        }
      }
    } else {
      try {
        const completion = await openai.chat.completions.create({
          model: realModelId,
          messages,
        });
        
        // Handle potentially undefined choices
        content = completion.choices?.[0]?.message?.content || "No response generated";
        console.log(renderMarkdown(content));
      } catch (error: any) {
        if (error.message && error.message.includes("does not exist")) {
          console.error(`Error: Model '${realModelId}' not found or not available with the ${provider} provider.`);
          console.error(`\nMake sure you've configured the API key for ${provider} and are using a valid model.`);
          console.error(`To see all available models, run: web3cli list`);
        } else {
          console.error("Error during request:", error.message || error);
        }
      }
    }
  } catch (error) {
    console.error("Error during request:", error);
  }
} 