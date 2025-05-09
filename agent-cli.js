#!/usr/bin/env node

/**
 * A simple CLI script to run the agent mode directly
 */

import { Command } from 'commander';
import { runAgentMode } from './src/agent-mode.js';

// Create the program
const program = new Command();

program
  .name('agent-cli')
  .description('Run the multi-agent system for Solidity smart contract generation')
  .version('1.0.0');

program
  .argument('<prompt>', 'Natural language description of the contract')
  .option('-o, --output <file>', 'Output file for the generated contract')
  .option('--hardhat', 'Generate Hardhat tests')
  .action(async (prompt, options) => {
    console.log('🚀 Starting agent mode for smart contract generation');
    console.log(`Prompt: ${prompt}`);
    
    try {
      await runAgentMode(prompt, options);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program.parse(); 