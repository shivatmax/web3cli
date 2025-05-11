#!/usr/bin/env node
/**
 * Web3CLI - Command Line Interface
 * 
 * Main entry point for the CLI application.
 */
import process from "node:process";
import { cac } from "cac";
import { loadConfig } from "../services/config/config.js";
import { registerGenerateCommand } from "./commands/generate.js";
import updateNotifier from "update-notifier";

import { fail } from "../utils/logger.js";

// Package version info (injected by build process)
declare const PKG_NAME: string;
declare const PKG_VERSION: string;

/**
 * Main entry point for the CLI
 */
async function main() {
  // Check for updates
  if (typeof PKG_NAME === "string" && typeof PKG_VERSION === "string") {
    updateNotifier({
      pkg: { name: PKG_NAME, version: PKG_VERSION },
      shouldNotifyInNpmScript: false,
    }).notify({
      isGlobal: true,
    });
  }

  // Initialize CLI
  const cli = cac("web3cli");
  loadConfig();

  // Register commands
  registerGenerateCommand(cli);
  // Add help and version
  cli.help();
  cli.version(PKG_VERSION || "0.0.0");

  // Parse and execute command
  try {
    cli.parse(process.argv, { run: false });
    await cli.runMatchedCommand();
  } catch (error) {
    // Unified clean error logging
    const msg = error instanceof Error ? error.message : String(error);
    fail(`Error: ${msg}`);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  const msg = error instanceof Error ? error.message : String(error);
  fail(`Error: ${msg}`);
  process.exit(1);
}); 