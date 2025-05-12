/**
 * Configuration Management Service
 * 
 * This module provides functionality for loading and managing configuration
 * from various sources (environment, config files, etc.)
 */
import JoyCon from "joycon";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import toml from "smol-toml";
import { z } from "zod";

/**
 * Path to the configuration directory
 */
export const configDirPath = path.join(os.homedir(), ".config", "web3cli");

/**
 * Schema for AI command variables
 */
const AICommandVariableSchema = z.union([
  z.string().describe("a shell command to run"),
  z
    .object({
      type: z.literal("input"),
      message: z.string(),
    })
    .describe("get text input from the user"),
  z
    .object({
      type: z.literal("select"),
      message: z.string(),
      choices: z.array(
        z.object({
          value: z.string(),
          title: z.string(),
        })
      ),
    })
    .describe("get a choice from the user"),
]);

export type AICommandVariable = z.infer<typeof AICommandVariableSchema>;

/**
 * Schema for AI commands
 */
const AICommandSchema = z.object({
  command: z.string().describe("the cli command"),
  example: z.string().optional().describe("example to show in cli help"),
  description: z
    .string()
    .optional()
    .describe("description to show in cli help"),
  variables: z.record(AICommandVariableSchema).optional(),
  prompt: z.string().describe("the prompt to send to the model"),
  require_stdin: z
    .boolean()
    .optional()
    .describe("Require piping output from another program to Web3CLI"),
});

export type AICommand = z.infer<typeof AICommandSchema>;

/**
 * Schema for the configuration file
 */
export const ConfigSchema = z.object({
  default_model: z.string().optional(),
  openai_api_key: z
    .string()
    .optional()
    .describe('Default to the "OPENAI_API_KEY" environment variable'),
  openai_api_url: z
    .string()
    .optional()
    .describe('Default to the "OPENAI_API_URL" environment variable'),
  anthropic_api_key: z
    .string()
    .optional()
    .describe('Default to the "ANTHROPIC_API_KEY" environment variable'),
  gemini_api_key: z
    .string()
    .optional()
    .describe('Default to the "GEMINI_API_KEY" environment variable'),
  gemini_api_url: z
    .string()
    .optional()
    .describe('Default to the "GEMINI_API_URL" environment variable'),
  groq_api_key: z
    .string()
    .optional()
    .describe('Default to the "GROQ_API_KEY" environment variable'),
  groq_api_url: z
    .string()
    .optional()
    .describe('Default to the "GROQ_API_URL" environment variable'),
  mistral_api_key: z
    .string()
    .optional()
    .describe('Default to the "MISTRAL_API_KEY" environment variable'),
  mistral_api_url: z
    .string()
    .optional()
    .describe('Default to the "MISTRAL_API_URL" environment variable'),
  etherscan_api_key: z
    .string()
    .optional()
    .describe('Default to the "ETHERSCAN_API_KEY" environment variable'),
  ollama_host: z
    .string()
    .optional()
    .describe('Default to the "OLLAMA_HOST" environment variable'),
  commands: z.array(AICommandSchema).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load configuration from various sources
 * 
 * @returns Merged configuration
 */
export function loadConfig(): Config {
  const joycon = new JoyCon.default();

  joycon.addLoader({
    test: /\.toml$/,
    loadSync: (filepath: string) => {
      const content = fs.readFileSync(filepath, "utf-8");
      return toml.parse(content);
    },
  });

  function safeLoad(filenames: string[], cwd: string, stopDir: string): Config | undefined {
    try {
      const result = joycon.loadSync(filenames, cwd, stopDir);
      return result.data as Config | undefined;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `Warning: ignored malformed config while reading ${filenames.join(", ")} — ${message}`
      );
      return undefined;
    }
  }

  const globalConfig = safeLoad(
    ["web3cli.json", "web3cli.toml"],
    configDirPath,
    path.dirname(configDirPath)
  );

  const localConfig = safeLoad(
    ["web3cli.json", "web3cli.toml"],
    process.cwd(),
    path.dirname(process.cwd())
  );

  let baseConfig: Config | undefined = undefined;
  let commandsFromConfig: AICommand[] = [];

  if (globalConfig) {
    baseConfig = { ...globalConfig };
    commandsFromConfig = [...(globalConfig.commands || [])];
  } else if (localConfig) {
    baseConfig = { ...localConfig };
    commandsFromConfig = [...(localConfig.commands || [])];
  } else {
    baseConfig = {}; // Ensure baseConfig is always an object
  }

  const config: Config = {
    ...(baseConfig as Config), // Spread, ensuring it's treated as Config
    commands: commandsFromConfig,
  };

  const envVarMapping = {
    openai_api_key: "OPENAI_API_KEY",
    openai_api_url: "OPENAI_API_URL",
    anthropic_api_key: "ANTHROPIC_API_KEY",
    gemini_api_key: "GEMINI_API_KEY",
    gemini_api_url: "GEMINI_API_URL",
    groq_api_key: "GROQ_API_KEY",
    groq_api_url: "GROQ_API_URL",
    mistral_api_key: "MISTRAL_API_KEY",
    mistral_api_url: "MISTRAL_API_URL",
    etherscan_api_key: "ETHERSCAN_API_KEY",
    ollama_host: "OLLAMA_HOST",
  };

  for (const [configKey, envVar] of Object.entries(envVarMapping)) {
    if (process.env[envVar] && !(config as any)[configKey]) {
      (config as any)[configKey] = process.env[envVar];
    }
  }

  return config;
} 