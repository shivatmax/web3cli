/**
 * Error classes for the application
 */

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