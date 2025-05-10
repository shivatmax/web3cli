/**
 * Contract Command
 * 
 * This module implements the 'contract' command for working with
 * smart contracts.
 */
import { Command as CliCommand } from 'cac';
import { readPipeInput } from '../../utils/tty';
import { 
  explainContract, 
  auditContract, 
  customContractRequest 
} from '../../services/contract/contract-commands';
import fs from 'fs';
import path from 'path';

/**
 * Register the contract command with the CLI
 * 
 * @param cli The CLI command instance
 * @returns The configured command
 */
export function registerContractCommand(cli: any): void {
  // Ensure output directory exists
  fs.mkdirSync(path.join(process.cwd(), 'output'), { recursive: true });
  
  // Main contract command
  cli
    .command('contract <source>', 'Analyze a smart contract')
    .option('-m, --model [model]', 'Choose the AI model to use, omit value to select interactively')
    .option('--network <network>', 'Ethereum network (default: sepolia)', { default: 'sepolia' })
    .option('-o, --output [dir]', 'Output directory for results, omit value to use default')
    .option('--no-stream', 'Disable streaming output')
    .option('--read-docs <n>', 'Read indexed docs collection as context')
    .action(async (source: string, flags: any) => {
      // By default, the main contract command uses explain
      await explainContract(source, {
        model: flags.model,
        network: flags.network,
        output: flags.output !== false ? (flags.output || true) : false,
        stream: flags.stream,
        readDocs: flags.readDocs
      });
    });
  
  // Explain subcommand (registered as a separate command)
  cli
    .command('contract:explain <source>', 'Generate a technical explanation of a smart contract')
    .option('-m, --model [model]', 'Choose the AI model to use, omit value to select interactively')
    .option('--network <network>', 'Ethereum network (default: sepolia)', { default: 'sepolia' })
    .option('-o, --output [dir]', 'Output directory for results, omit value to use default')
    .option('--no-stream', 'Disable streaming output')
    .option('--read-docs <n>', 'Read indexed docs collection as context')
    .action(async (source: string, flags: any) => {
      await explainContract(source, {
        model: flags.model,
        network: flags.network,
        output: flags.output !== false ? (flags.output || true) : false,
        stream: flags.stream,
        readDocs: flags.readDocs
      });
    });
  
  // Audit subcommand
  cli
    .command('contract:audit <source>', 'Perform a security audit of a smart contract')
    .option('-m, --model [model]', 'Choose the AI model to use, omit value to select interactively')
    .option('--network <network>', 'Ethereum network (default: sepolia)', { default: 'sepolia' })
    .option('-o, --output [dir]', 'Output directory for results, omit value to use default')
    .option('--no-stream', 'Disable streaming output')
    .option('--read-docs <n>', 'Read indexed docs collection as context')
    .action(async (source: string, flags: any) => {
      await auditContract(source, {
        model: flags.model,
        network: flags.network,
        output: flags.output !== false ? (flags.output || true) : false,
        stream: flags.stream,
        readDocs: flags.readDocs
      });
    });
  
  // Custom query subcommand
  cli
    .command('contract:ask <source> <query>', 'Ask a specific question about a smart contract')
    .option('-m, --model [model]', 'Choose the AI model to use, omit value to select interactively')
    .option('--network <network>', 'Ethereum network (default: sepolia)', { default: 'sepolia' })
    .option('-o, --output [dir]', 'Output directory for results, omit value to use default')
    .option('--no-stream', 'Disable streaming output')
    .option('--read-docs <n>', 'Read indexed docs collection as context')
    .action(async (source: string, query: string, flags: any) => {
      await customContractRequest(source, query, {
        model: flags.model,
        network: flags.network,
        output: flags.output !== false ? (flags.output || true) : false,
        stream: flags.stream,
        readDocs: flags.readDocs
      });
    });
} 