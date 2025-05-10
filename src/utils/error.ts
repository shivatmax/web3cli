/**
 * Error classes for the application
 */
import { bold, yellow, red } from 'colorette';

/**
 * Display a helpful message when a command is not found
 * @param commandName The command that was not found
 * @param availableCommands List of available commands
 */
export function showCommandNotFoundMessage(commandName: string, availableCommands: string[]): void {
  console.error(red(`Error: Unknown command '${commandName}'`));
  
  const similarCommands = availableCommands
    .filter(cmd => cmd.startsWith(commandName[0]) || cmd.includes(commandName))
    .slice(0, 3);
  
  if (similarCommands.length > 0) {
    console.log(yellow(`\nDid you mean one of these?`));
    similarCommands.forEach(cmd => console.log(yellow(`  ${cmd}`)));
  }
  
  console.log(`\nRun ${bold('web3cli --help')} to see all available commands.`);
}

/**
 * Base error class for CLI errors
 */
export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

/**
 * Error for configuration issues
 */
export class ConfigError extends CliError {
  constructor(message: string) {
    super(`Configuration error: ${message}`);
    this.name = 'ConfigError';
  }
}

/**
 * Error for API issues
 */
export class ApiError extends CliError {
  constructor(message: string) {
    super(`API error: ${message}`);
    this.name = 'ApiError';
  }
}

/**
 * Error for file system issues
 */
export class FileSystemError extends CliError {
  constructor(message: string) {
    super(`File system error: ${message}`);
    this.name = 'FileSystemError';
  }
}

/**
 * Error for contract generation issues
 */
export class ContractGenerationError extends CliError {
  constructor(message: string) {
    super(`Contract generation error: ${message}`);
    this.name = 'ContractGenerationError';
  }
}

/**
 * Error for validation issues
 */
export class ValidationError extends CliError {
  constructor(message: string) {
    super(`Validation error: ${message}`);
    this.name = 'ValidationError';
  }
}

/**
 * Error for when a command is not found
 */
export class CommandNotFoundError extends CliError {
  constructor(commandName: string) {
    super(`Unknown command: ${commandName}`);
    this.name = 'CommandNotFoundError';
    this.commandName = commandName;
  }
  
  commandName: string;
} 