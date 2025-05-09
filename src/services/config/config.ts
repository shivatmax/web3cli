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
  etherscan_api_key: z
    .string()
    .optional()
    .describe('Default to the "ETHERSCAN_API_KEY" environment variable'),
  commands: z.array(AICommandSchema).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load configuration from various sources
 * 
 * @returns Merged configuration
 */
export function loadConfig(): Config {
  const joycon = new JoyCon();

  // Add TOML loader
  joycon.addLoader({
    test: /\.toml$/,
    loadSync: (filepath) => {
      console.log(`Loading TOML config from: ${filepath}`);
      const content = fs.readFileSync(filepath, "utf-8");
      console.log(`TOML content: ${content.substring(0, 100)}...`);
      return toml.parse(content);
    },
  });

  /**
   * Safely load configuration files
   */
  function safeLoad(filenames: string[], cwd: string, stopDir: string) {
    try {
      console.log(`Looking for config files: ${filenames.join(', ')} in ${cwd}`);
      const result = joycon.loadSync(filenames, cwd, stopDir);
      console.log(`Config found: ${result.path || 'none'}`);
      return result.data as Config | undefined;
    } catch (err) {
      // JoyCon will throw if it finds a file but fails to parse JSON/TOML.
      // Instead of crashing the whole CLI we ignore the malformed file and
      // continue – printing a helpful diagnostic so the user can fix it.
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `Warning: ignored malformed config while reading ${filenames.join(", ")} — ${message}`
      );
      return undefined;
    }
  }

  // Load global and local configurations
  const globalConfig = safeLoad(
    ["config.json", "config.toml"],
    configDirPath,
    path.dirname(configDirPath)
  );

  const localConfig = safeLoad(
    ["web3cli.json", "web3cli.toml"],
    process.cwd(),
    path.dirname(process.cwd())
  );

  // Merge configurations with local taking precedence
  const config = {
    ...globalConfig,
    ...localConfig,
    commands: [
      ...(globalConfig?.commands || []),
      ...(localConfig?.commands || []),
    ],
  };

  // Add environment variables if they exist
  if (process.env.OPENAI_API_KEY && !config.openai_api_key) {
    config.openai_api_key = process.env.OPENAI_API_KEY;
  }
  
  if (process.env.ETHERSCAN_API_KEY && !config.etherscan_api_key) {
    config.etherscan_api_key = process.env.ETHERSCAN_API_KEY;
  }
  
  console.log("Final config:", { 
    default_model: config.default_model,
    openai_api_key: config.openai_api_key ? "PRESENT" : "MISSING",
    etherscan_api_key: config.etherscan_api_key ? "PRESENT" : "MISSING"
  });

  return config;
} 