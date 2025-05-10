#!/usr/bin/env node
import process from "node:process"
import { cac, Command as CliCommand } from "cac"
import { bold, green, underline } from "colorette"
import { getAllModels } from "./services/ai/models"
import updateNotifier from "update-notifier"
import { ask } from "./services/ai/ask"
import { getAllCommands, getPrompt } from "./services/ai/ai-command"
import { readPipeInput } from "./utils/tty"
import { CliError } from "./utils/error"
import { loadConfig } from "./services/config/config"
import { APICallError } from "ai"
import { generateContract } from "./services/contract/generate-contract"
import { explainContract } from "./services/contract/explain-contract"
import { runAgentMode } from "./services/contract/agent-mode"
import { 
  explainContract as contractExplain, 
  auditContract, 
  customContractRequest 
} from "./services/contract/contract-commands"
import { registerVectorDBCommands } from "./cli/commands/vector-db"

if (typeof PKG_NAME === "string" && typeof PKG_VERSION === "string") {
  updateNotifier({
    pkg: { name: PKG_NAME, version: PKG_VERSION },
    shouldNotifyInNpmScript: false,
  }).notify({
    isGlobal: true,
  })
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
    .action(async (prompt, flags) => {
      const pipeInput = await readPipeInput()
      if (flags.agent) {
        console.log('🚀 Using experimental multi-agent mode')
        await runAgentMode(prompt.join(" "), flags)
      } else {
        await generateContract(prompt.join(" "), { ...flags, pipeInput })
      }
    })

  // Task 2: Explain smart contract
  // Contract commands
  cli
    .command("contract <source>", "Analyze a smart contract")
    .option("-m, --model [model]", "Choose the AI model to use, omit value to select interactively")
    .option("--network <network>", "Ethereum network (default: sepolia)", { default: "sepolia" })
    .option("-o, --output", "Save results to output directory")
    .option("--no-stream", "Disable streaming output")
    .option("--read-docs <n>", "Read indexed docs collection as context")
    .action(async (source: string, flags: any) => {
      // By default, the main contract command uses explain
      await contractExplain(source, flags)
    })
  
  // Contract explain command
  cli
    .command("contract:explain <source>", "Generate a technical explanation of a smart contract")
    .option("-m, --model [model]", "Choose the AI model to use, omit value to select interactively")
    .option("--network <network>", "Ethereum network (default: sepolia)", { default: "sepolia" })
    .option("-o, --output", "Save results to output directory")
    .option("--no-stream", "Disable streaming output")
    .option("--read-docs <n>", "Read indexed docs collection as context")
    .action(async (source: string, flags: any) => {
      await contractExplain(source, flags)
    })
  
  // Contract audit command
  cli
    .command("contract:audit <source>", "Perform a security audit of a smart contract")
    .option("-m, --model [model]", "Choose the AI model to use, omit value to select interactively")
    .option("--network <network>", "Ethereum network (default: sepolia)", { default: "sepolia" })
    .option("-o, --output", "Save results to output directory")
    .option("--no-stream", "Disable streaming output")
    .option("--read-docs <n>", "Read indexed docs collection as context")
    .action(async (source: string, flags: any) => {
      await auditContract(source, flags)
    })
  
  // Contract custom command
  cli
    .command("contract:custom <source> [...query]", "Ask a custom question about a smart contract")
    .option("-m, --model [model]", "Choose the AI model to use, omit value to select interactively")
    .option("--network <network>", "Ethereum network (default: sepolia)", { default: "sepolia" })
    .option("-o, --output", "Save results to output directory")
    .option("--no-stream", "Disable streaming output")
    .option("--read-docs <n>", "Read indexed docs collection as context")
    .action(async (source: string, query: string[], flags: any) => {
      const pipeInput = await readPipeInput()
      const queryString = query.join(" ") || pipeInput || "Explain this contract in detail"
      await customContractRequest(source, queryString, flags)
    })

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
    .option("--name <name>", "Collection name for the docs", { default: "solidity" })
    .option("--crawl", "Recursively crawl links under the same domain")
    .option("--max-pages <number>", "Maximum pages to crawl (default 30)")
    .action(async (url, flags) => {
      const { VectorDB } = await import("./services/vector-db/vector-db")
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
      const { VectorDB } = await import("./services/vector-db/vector-db")
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

  cli.help()
  cli.version(PKG_VERSION || "0.0.0")

  try {
    cli.parse(process.argv, { run: false })
    await cli.runMatchedCommand()
  } catch (error) {
    if (error instanceof CliError) {
      console.error(error.message)
      process.exit(1)
    } else if (error instanceof APICallError) {
      console.error("API Error:", error.message)
      process.exit(1)
    } else {
      console.error(error)
      process.exit(1)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})