/**
 * Smart Contract Generation Command
 * 
 * This module implements the 'generate' command for creating smart contracts
 * from natural language descriptions.
 */
import fs from 'node:fs';
import { Command as CliCommand } from 'cac';
import { readPipeInput } from '../../utils/tty';
import { generateContract } from '../../services/contract/generator';
import { runAgentMode } from '../../services/contract/agent-mode';

/**
 * Register the generate command with the CLI
 * 
 * @param cli The CLI command instance
 * @returns The configured command
 */
export function registerGenerateCommand(cli: any): CliCommand {
  const command = cli
    .command('generate [...prompt]', 'Generate a smart contract from natural language')
    .option('-m, --model [model]', 'Choose the AI model to use, omit value to select interactively')
    .option('--files <pattern>', 'Add files to model context')
    .option('-u,--url <url>', 'Fetch URL content as context')
    .option('-s, --search', 'Enable web search focused on security best practices')
    .option('--no-stream', 'Disable streaming output')
    .option('--read-docs <n>', 'Read indexed docs collection as context')
    .option('-o, --output <filename>', 'Output generated contract to a file')
    .option('--hardhat', 'Include Hardhat test file generation')
    .option('--agent', 'Use hierarchical multi-agent mode (experimental)')
    .action(async (prompt: string[], flags: any) => {
      const pipeInput = await readPipeInput();
      if (flags.agent) {
        console.log('🚀 Using experimental multi-agent mode');
        await runAgentMode(prompt.join(' '), flags);
      } else {
        await generateContract(prompt.join(' '), { ...flags, pipeInput });
      }
    });
    
  return command;
}

/**
 * Save generated contract to file
 * 
 * @param code The contract code
 * @param filename The target filename
 */
export function saveContractToFile(code: string, filename: string): void {
  fs.writeFileSync(filename, code);
  console.log(`✅ Contract saved to ${filename}`);
} 