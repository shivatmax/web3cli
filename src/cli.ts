#!/usr/bin/env node
import process from "node:process"
import { cac, Command as CliCommand, CAC } from "cac"
import { bold, red, yellow, blue } from "colorette"
import { getAllModels } from "./services/ai/models.js"
import updateNotifier from "update-notifier"
import { ask } from "./services/ai/ask.js"
import { readPipeInput } from "./utils/tty.js"
import { CliError, ValidationError, CommandNotFoundError, showCommandNotFoundMessage } from "./utils/error.js"
import { loadConfig } from "./services/config/config.js"
import { APICallError } from "ai"
import { generateContract } from "./services/contract/generate-contract.js"
import { runAgentMode } from "./services/contract/agent-mode.js"
import { registerVectorDBCommands } from "./cli/commands/vector-db.js"
import { registerContractCommand } from "./cli/commands/contract.js"
import { step, fail} from "./utils/logger.js"

// Redirect console methods to clean log styles
console.log = (...args: any[]) => step(args.join(" "));
console.error = (...args: any[]) => fail(args.join(" "));

if (typeof PKG_NAME === "string" && typeof PKG_VERSION === "string") {
  updateNotifier({
    pkg: { name: PKG_NAME, version: PKG_VERSION },
    shouldNotifyInNpmScript: false,
  }).notify({
    isGlobal: true,
  })
}

/**
 * Shows similar commands when an unknown command is used
 * @param cli - CAC instance
 * @param unknownCommand - The unknown command entered by user
 */
function showSimilarCommands(cli: CAC, unknownCommand: string): string[] {
  const availableCommands = Array.from(cli.commands.keys())
  const similarCommands = availableCommands.filter(cmd => {
    // Simple similarity check - commands that start with the same letter or contain the entered text
    return cmd.toString().startsWith(unknownCommand[0]) || cmd.toString().includes(unknownCommand)
  }).slice(0, 3) // Limit to 3 suggestions
  
  return similarCommands.map(cmd => cmd.toString())
}

/**
 * Shows helpful error message for unknown option
 * @param command - The command that was run
 * @param unknownOption - The unknown option
 * @returns Array of close option matches
 */
function showSimilarOptions(command: CliCommand, unknownOption: string): string[] {
  // Extract available options for this command
  const availableOptions = command.options.map(option => option.rawName)
  
  // Find similar options using simple matching
  const similarOptions = availableOptions.filter(opt => {
    const cleanOpt = opt.replace(/^-+/, '') // Remove leading dashes
    const cleanUnknown = unknownOption.replace(/^-+/, '')
    return cleanOpt.startsWith(cleanUnknown[0]) || cleanOpt.includes(cleanUnknown)
  }).slice(0, 3) // Limit to 3 suggestions
  
  return similarOptions
}

function applyCommonFlags(command: CliCommand) {
  command.option("-m, --model [model]", "Choose the AI model to use, omit value to select interactively")
  command.option("--files <pattern>", "Add files to model context")
  command.option("-t, --type <type>", "Define the shape of the response in TypeScript")
  command.option("-u, --url <url>", "Fetch URL content as context")
  command.option("-s, --search", "Enable web search")
  command.option("--no-stream", "Disable streaming output")
  command.option("--read-docs <n>", "Read indexed docs collection as context")
  return command
}

/**
 * Global error handler for various error types with helpful messages
 * @param error Error that occurred 
 * @param exit Whether to exit the process
 */
function handleGlobalError(error: any, exit: boolean = true): void {
  const githubIssueUrl = "https://github.com/shivatmax/web3cli/issues/new";
  
  console.error("");
  
  if (error.code === 'ENOENT' && error.syscall === 'mkdir') {
    console.error(red(`Error creating directory: ${error.path}`));
    console.error(yellow("Solution: Check write permissions or create parent directories manually"));
  } else if (error.code === 'EACCES') {
    console.error(red(`Permission denied: ${error.path}`));
    console.error(yellow("Solution: Check file/directory permissions or run with elevated privileges"));
  } else if (error instanceof CliError) {
    console.error(red(`Command error: ${error.message}`));
  } else if (error instanceof APICallError) {
    console.error(red(`API error: ${error.message}`));
    console.error(yellow("Solution: Check your API keys and network connection"));
  } else if (error instanceof ValidationError) {
    console.error(red(`Validation error: ${error.message}`));
  } else if (error.name === 'CACError') {
    console.error(red(`Command error: ${error.message}`));
  } else {
    console.error(red(`Unexpected error: ${error.message || String(error)}`));
  }
  
  // Show detailed information in debug mode
  if (process.env.DEBUG) {
    console.error("\nDetailed error information:");
    console.error(error);
  } else {
    console.error(yellow("\nFor detailed information, run with DEBUG=true"));
  }
  
  // Suggest reporting the issue
  console.error(blue(`\nPlease report this issue on GitHub: ${githubIssueUrl}`));
  console.error(blue("Include the error message above and steps to reproduce the problem"));
  
  if (exit) {
    process.exit(1);
  }
}

async function main() {
  const cli = cac("web3cli")
  const config = loadConfig()

  // Base command for general questions
  const root = cli.command("[...prompt]", "Ask a general Web3 development question")
  applyCommonFlags(root)
  root.action(async (prompt, flags) => {
    const pipeInput = await readPipeInput()
    await ask(prompt.join(" "), { ...flags, pipeInput })
  })

  // Task 1: Generate smart contract from natural language
  cli
    .command("generate [...prompt]", "Generate a smart contract from natural language")
    .option("-m, --model [model]", "Choose the AI model to use, omit value to select interactively")
    .option("--files <pattern>", "Add files to model context")
    .option("-u,--url <url>", "Fetch URL content as context")
    .option("-s, --search", "Enable web search focused on security best practices")
    .option("--no-stream", "Disable streaming output")
    .option("--read-docs <n>", "Read indexed docs collection as context")
    .option("-o, --output <filename>", "Output generated contract to a file")
    .option("--hardhat", "Include Hardhat test file generation")
    .option("--agent", "Use hierarchical multi-agent mode (experimental)")
    .option("--max-lines <number>", "Maximum lines in the generated contract")
    .option("--transparent-proxy", "Generate upgradeable contract using OpenZeppelin Transparent Proxy pattern")
    .option("--uups-proxy", "Generate upgradeable contract using UUPS proxy pattern")
    .action(async (prompt, flags) => {
      const pipeInput = await readPipeInput()
      // Determine proxy type from flags
      const proxyType = flags.transparentProxy ? "transparent" : flags.uupsProxy ? "uups" : undefined;
      const extendedFlags = { ...flags, pipeInput, proxy: proxyType };

      if (flags.agent) {
        console.log('🚀 Using experimental multi-agent mode')
        await runAgentMode(prompt.join(" "), extendedFlags)
      } else {
        await generateContract(prompt.join(" "), extendedFlags)
      }
    })

  // Task 2: Explain smart contract
  // Contract commands - using the modular command registration
  registerContractCommand(cli)
  
  // Legacy contract commands are now handled in registerContractCommand
  
  // List available models
  cli
    .command("list", "List available models")
    .alias("ls")
    .action(async () => {
      const models = await getAllModels(true)
      for (const model of models) {
        console.log(model.id)
      }
    })

  // Vector DB commands for documentation
  cli
    .command("add-docs <url>", "Add docs from URL to vector DB")
    .option("--name <n>", "Collection name for the docs", { default: "solidity" })
    .option("--crawl", "Recursively crawl links under the same domain")
    .option("--max-pages <number>", "Maximum pages to crawl (default 30)")
    .action(async (url, flags) => {
      const { VectorDB } = await import("./services/vector-db/vector-db.js")
      const vdb = new VectorDB()
      console.log(`Fetching & indexing docs from ${url} ...`)
      const added = await vdb.addDocs(
        flags.name,
        url,
        { crawl: flags.crawl, maxPages: flags.maxPages ? Number(flags.maxPages) : undefined }
      )
      console.log(`Indexed ${added} chunks into collection '${flags.name}'.`)
    })

  cli
    .command("setup", "Set up documentation for Web3 development")
    .option('--max-pages <number>', 'Maximum pages to crawl per source', { default: 50 })
    .action(async (options: any) => {
      const { VectorDB } = await import("./services/vector-db/vector-db.js")
      const vdb = new VectorDB()
      const maxPages = parseInt(options.maxPages)
      
      console.log("Setting up documentation for Web3 development...")
      console.log(`Maximum pages per source: ${maxPages}`)
      
      console.log("1/4: Adding Solidity documentation...")
      await vdb.addDocs("solidity", "https://docs.soliditylang.org/", 
        { crawl: true, maxPages: maxPages })
      
      console.log("2/4: Adding Ethers.js documentation...")
      await vdb.addDocs("ethers", "https://docs.ethers.org/v6/", 
        { crawl: true, maxPages: maxPages })
      
      console.log("3/4: Adding Hardhat documentation...")
      await vdb.addDocs("hardhat", "https://hardhat.org/hardhat-runner/docs/", 
        { crawl: true, maxPages: maxPages })
      
      console.log("4/4: Adding OpenZeppelin documentation...")
      await vdb.addDocs("openzeppelin", "https://docs.openzeppelin.com/contracts/", 
        { crawl: true, maxPages: maxPages })
        
      console.log("Setup complete! You can now use --read-docs with solidity, ethers, hardhat, or openzeppelin")
    })

  // Register vector database commands
  registerVectorDBCommands(cli)
  
  // Simple test command
  cli
    .command('vdb-test', 'Simple test command for vector database')
    .action(() => {
      console.log('Vector database test command executed successfully!')
      console.log('This command is working properly.')
    })

  // Create backward compatibility aliases for vector-db commands
  cli.command('vector-db', 'Vector database commands (alias to vector-db-* commands)').action(() => {
    console.log('Vector Database commands are now available as:');
    console.log('  vector-db-add-docs  - Add documents from a URL');
    console.log('  vector-db-add-file  - Add a file to the database');
    console.log('  vector-db-search    - Search the database');
    console.log('  vector-db-list      - List all collections');
    console.log('\nExample: web3cli vector-db-search "my query" --name my-collection');
  });

  // Add help command explicitly
  cli.command('help [command]', 'Display help for a command').action((command) => {
    if (command) {
      const cmd = cli.commands.find(c => c.name === command || c.name.includes(command))
      if (cmd) {
        console.log(`Command: ${cmd.name}`)
        if (cmd.description) console.log(`Description: ${cmd.description}`)
        console.log('\nOptions:')
        cmd.options.forEach(opt => {
          console.log(`  ${opt.rawName}` + (opt.description ? `\t${opt.description}` : ''))
        })
      } else {
        console.log(`Command '${command}' not found.`)
        
        // Show similar commands
        const similarCommands = showSimilarCommands(cli, command)
        if (similarCommands.length > 0) {
          console.log(yellow(`\nDid you mean one of these?`))
          similarCommands.forEach(cmd => console.log(yellow(`  ${cmd}`)))
        }
        
        console.log(`\nRun 'web3cli help' to see all available commands.`)
      }
    } else {
      console.log(bold('web3cli - Command-line AI assistant for Web3 developers\n'))
      console.log('Usage:')
      console.log('  $ web3cli <command> [options]\n')
      console.log('Available Commands:')
      
      // Get all commands
      cli.commands.forEach(cmd => {
        if (cmd.name && cmd.description) {
          console.log(`  ${cmd.name.padEnd(20)} ${cmd.description}`)
        }
      })
      
      console.log('\nFor more info, run any command with the `--help` flag')
      console.log('  $ web3cli generate --help')
    }
  })

  // Handle unknown command with command:*
  cli.on('command:*', async () => {
    console.error(red(`Error: Unknown command '${cli.args.join(' ')}'`))
    
    const unknownCommand = cli.args[0]
    // Show similar commands
    const availableCommands = Array.from(cli.commands.keys())
    const similarCommands = availableCommands
      .filter(cmd => cmd.toString().startsWith(unknownCommand[0]) || 
                    cmd.toString().includes(unknownCommand))
      .slice(0, 3)
      .map(cmd => cmd.toString())
    
    if (similarCommands.length > 0) {
      console.log(yellow(`\nDid you mean one of these?`))
      similarCommands.forEach(cmd => console.log(yellow(`  ${cmd}`)))
    }
    
    console.log(`\nRun ${bold('web3cli --help')} to see all available commands.`)
    process.exit(1)
  })

  cli.help()
  cli.version(PKG_VERSION || "0.0.0")

  try {
    cli.parse(process.argv, { run: false })
    
    // Check for unknown command
    const matchedCommand = cli.matchedCommand
    if (!matchedCommand && cli.args.length > 0 && !cli.args.join(' ').trim().startsWith('-')) {
      const unknownCommand = cli.args[0]
      const availableCommands = cli.commands.map(cmd => cmd.name).filter(Boolean)
      showCommandNotFoundMessage(unknownCommand, availableCommands)
      process.exit(1)
    }
    
    await cli.runMatchedCommand()
  } catch (error: any) {
    if (error.name === 'CACError' && error.message && error.message.includes('Unknown option')) {
      // Extract the unknown option name
      const match = error.message.match(/Unknown option `([^`]+)`/)
      const unknownOption = match ? match[1] : ''
      
      console.error(red(`Error: ${error.message}`))
      
      // Find the command that was being executed
      const command = cli.matchedCommand
      if (command && unknownOption) {
        // Show similar options
        const similarOptions = showSimilarOptions(command, unknownOption)
        if (similarOptions.length > 0) {
          console.log(yellow(`\nDid you mean one of these?`))
          similarOptions.forEach(opt => console.log(yellow(`  ${opt}`)))
        }
        
        // Show command help
        console.log(`\nAvailable options for '${command.name || "command"}':\n`)
        command.options.forEach(opt => {
          console.log(`  ${opt.rawName}` + (opt.description ? `\t${opt.description}` : ''))
        })
      }
      
      process.exit(1)
    } else if (error instanceof CommandNotFoundError) {
      // Use our helper for unknown commands
      const availableCommands = cli.commands.map(cmd => cmd.name).filter(Boolean)
      showCommandNotFoundMessage(error.commandName, availableCommands)
      process.exit(1)
    } else {
      // Use our global error handler for all other errors
      handleGlobalError(error)
    }
  }
}

main().catch((error) => {
  handleGlobalError(error)
})

// Add an unhandled rejection handler
process.on('unhandledRejection', (reason) => {
  console.error(red('\nUnhandled Promise Rejection'));
  handleGlobalError(reason, false);
  process.exit(1);
});

// Add uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error(red('\nUncaught Exception'));
  handleGlobalError(error, false);
  process.exit(1);
});