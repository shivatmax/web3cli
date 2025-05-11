/**
 * Built-in Commands
 * 
 * This module provides built-in commands for the CLI.
 */
import { AICommand } from "../../services/config/config.js";

/**
 * Get built-in commands
 * 
 * @returns Array of built-in commands
 */
export function getBuiltinCommands(): AICommand[] {
  return [
    // Example built-in command
    {
      command: "explain-solidity",
      prompt: "Explain the following Solidity code: {code}",
      variables: {
        code: {
          type: "input",
          message: "Enter Solidity code to explain",
        },
      },
    },
  ]
} 