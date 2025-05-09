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
import { auditContract } from "./services/contract/audit-contract"
import { processContractRequest } from "./services/contract/custom-request"

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
  cli
    .command("explain <contractAddress|filePath>", "Explain a smart contract")
    .option("-m, --model [model]", "Choose the AI model to use, omit value to select interactively")
    .option("--network <network>", "Ethereum network (default: sepolia)", { default: "sepolia" })
    .option("--no-stream", "Disable streaming output")
    .option("--read-docs <n>", "Read indexed docs collection as context")
    .action(async (source, flags) => {
      await explainContract(source, flags)
    })

  // New contract command with subcommands
  const contractCmd = cli
    .command("contract <contractAddress|filePath>", "Work with smart contracts")
    .option("-m, --model [model]", "Choose the AI model to use, omit value to select interactively")
    .option("--network <network>", "Ethereum network (default: sepolia)", { default: "sepolia" })
    .option("--no-stream", "Disable streaming output")
    .option("--read-docs <n>", "Read indexed docs collection as context")
    .option("-o, --output <filename>", "Output results to a file")
    .action(async (source, flags) => {
      // Default behavior when no subcommand is provided - explain the contract
      await explainContract(source, flags)
    })

  // Contract audit command
  cli
    .command("contract audit <contractAddress|filePath>", "Audit a smart contract for security vulnerabilities")
    .option("-m, --model [model]", "Choose the AI model to use, omit value to select interactively")
    .option("--network <network>", "Ethereum network (default: sepolia)", { default: "sepolia" })
    .option("--no-stream", "Disable streaming output")
    .option("--read-docs <n>", "Read indexed docs collection as context")
    .option("-o, --output <filename>", "Output results to a file")
    .option("--fix", "Generate fixed code addressing the vulnerabilities")
    .action(async (source, flags) => {
      await auditContract(source, flags)
    })

  // Contract explain command
  cli
    .command("contract explain <contractAddress|filePath>", "Explain a smart contract in detail")
    .option("-m, --model [model]", "Choose the AI model to use, omit value to select interactively")
    .option("--network <network>", "Ethereum network (default: sepolia)", { default: "sepolia" })
    .option("--no-stream", "Disable streaming output")
    .option("--read-docs <n>", "Read indexed docs collection as context")
    .option("-o, --output <filename>", "Output results to a file")
    .action(async (source, flags) => {
      await explainContract(source, flags)
    })

  // Custom contract request command
  cli
    .command("contract request <contractAddress|filePath> <customRequest>", "Make a custom request about a smart contract")
    .option("-m, --model [model]", "Choose the AI model to use, omit value to select interactively")
    .option("--network <network>", "Ethereum network (default: sepolia)", { default: "sepolia" })
    .option("--no-stream", "Disable streaming output")
    .option("--read-docs <n>", "Read indexed docs collection as context")
    .option("-o, --output <filename>", "Output results to a file")
    .option("--web", "Enable web search for additional context")
    .action(async (source, request, flags) => {
      await processContractRequest(source, request, flags)
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
    .action(async () => {
      const { VectorDB } = await import("./services/vector-db/vector-db")
      const vdb = new VectorDB()
      
      console.log("Setting up documentation for Web3 development...")
      
      console.log("1/3: Adding Solidity documentation...")
      await vdb.addDocs("solidity", "https://docs.soliditylang.org/", 
        { crawl: true, maxPages: 50 })
      
      console.log("2/3: Adding Ethers.js documentation...")
      await vdb.addDocs("ethers", "https://docs.ethers.org/v6/", 
        { crawl: true, maxPages: 50 })
      
      console.log("3/3: Adding Hardhat documentation...")
      await vdb.addDocs("hardhat", "https://hardhat.org/hardhat-runner/docs/", 
        { crawl: true, maxPages: 50 })
        
      console.log("Setup complete! You can now use --read-docs with solidity, ethers, or hardhat")
    })

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