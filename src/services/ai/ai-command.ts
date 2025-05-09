/**
 * AI Command Management
 * 
 * This module provides functionality for managing AI-powered commands.
 */
import { loadConfig, AICommand } from "../config/config"
import { runCommand } from "../../utils/common"
import cliPrompts from "prompts"
import { stdin } from "../../utils/tty"

const promptCache = new Map<string, string>()

/**
 * Get all commands defined in config
 * 
 * @returns Array of AICommand objects
 */
export async function getAllCommands(): Promise<AICommand[]> {
  const config = loadConfig()
  return config.commands || []
}

/**
 * Process a command's variables
 * 
 * @param command The AICommand object
 * @returns Variables map with values
 */
export async function getVariables(command: AICommand): Promise<Record<string, string>> {
  const variables: Record<string, string> = {}

  // If no variables defined, return empty object
  if (!command.variables) return variables

  for (const [key, value] of Object.entries(command.variables)) {
    if (typeof value === "string") {
      variables[key] = await runCommand(value)
      continue
    }

    if (value.type === "input") {
      const { value: input } = await cliPrompts({
        type: "text",
        name: "value",
        message: value.message,
        stdin,
      })
      variables[key] = input
      continue
    }

    if (value.type === "select") {
      const { value: selected } = await cliPrompts({
        type: "select",
        name: "value",
        message: value.message,
        choices: value.choices,
        stdin,
      })
      variables[key] = selected
      continue
    }
  }

  return variables
}

/**
 * Get the prompt for a command
 * 
 * @param command The AICommand object
 * @param variables Variables map with values
 * @returns Formatted prompt
 */
export function getPrompt(command: AICommand, variables: Record<string, string>): string {
  let prompt = command.prompt

  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(new RegExp(`{${key}}`, "g"), value)
  }

  return prompt
} 