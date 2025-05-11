/**
 * Contract Utilities
 * 
 * This module provides utilities for working with smart contracts,
 * including fetching contract data from Etherscan.
 */
import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, configDirPath } from '../config/config.js';
import { ethers } from 'ethers';

/**
 * The result of fetching contract source code from Etherscan
 */
export interface ContractSourceResult {
  abi: any;
  contractName: string;
  sourceCode: string;
  bytecode: string;
  constructorArguments: string;
  compilerVersion: string;
  optimizationUsed: string;
  runs: string;
  evmVersion: string;
  library: string;
  licenseType: string;
  proxy: string;
  implementation: string;
  swarmSource: string;
}

/**
 * Network configuration for supported networks
 */
export interface NetworkConfig {
  name: string;
  chainId: number;
  apiUrl: string;
  explorerUrl: string;
}

/**
 * Networks supported by Etherscan API
 */
export const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
  mainnet: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    apiUrl: 'https://api.etherscan.io/api',
    explorerUrl: 'https://etherscan.io'
  },
  sepolia: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    apiUrl: 'https://api-sepolia.etherscan.io/api',
    explorerUrl: 'https://sepolia.etherscan.io'
  },
  goerli: {
    name: 'Goerli Testnet',
    chainId: 5,
    apiUrl: 'https://api-goerli.etherscan.io/api',
    explorerUrl: 'https://goerli.etherscan.io'
  },
  polygon: {
    name: 'Polygon Mainnet',
    chainId: 137,
    apiUrl: 'https://api.polygonscan.com/api',
    explorerUrl: 'https://polygonscan.com'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    apiUrl: 'https://api.arbiscan.io/api',
    explorerUrl: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism Mainnet',
    chainId: 10,
    apiUrl: 'https://api-optimistic.etherscan.io/api',
    explorerUrl: 'https://optimistic.etherscan.io'
  }
};

/**
 * Get network configuration for the given network name
 * 
 * @param network Network name (e.g., 'mainnet', 'sepolia')
 * @returns Network configuration
 */
export function getNetworkConfig(network: string): NetworkConfig {
  const config = SUPPORTED_NETWORKS[network.toLowerCase()];
  
  if (!config) {
    throw new Error(`Unsupported network: ${network}. Supported networks: ${Object.keys(SUPPORTED_NETWORKS).join(', ')}`);
  }
  
  return config;
}

/**
 * Fetch contract source code from Etherscan
 * 
 * @param contractAddress Contract address
 * @param networkName Network name (default: 'sepolia')
 * @returns Contract source code information
 */
export async function fetchContractSource(
  contractAddress: string, 
  networkName: string = 'sepolia'
): Promise<ContractSourceResult> {
  const config = loadConfig();
  const apiKey = config.etherscan_api_key;
  
  if (!apiKey) {
    const localPath = path.join(process.cwd(), 'web3cli.toml');
    const globalPath = path.join(configDirPath, 'web3cli.toml');
    throw new Error(
      `Etherscan API key not found. Please set the ETHERSCAN_API_KEY environment variable, ` +
      `or add etherscan_api_key to your web3cli.toml configuration file (${localPath} or ${globalPath}).`
    );
  }
  
  const network = getNetworkConfig(networkName);
  
  const response = await axios.get(network.apiUrl, {
    params: {
      module: 'contract',
      action: 'getsourcecode',
      address: contractAddress,
      apikey: apiKey
    }
  });
  
  if (response.data.status !== '1') {
    throw new Error(`Etherscan API error: ${response.data.message}`);
  }
  
  const sourceData = response.data.result[0];
  
  if (!sourceData) {
    throw new Error(`Contract not found at address ${contractAddress}`);
  }
  
  return {
    abi: sourceData.ABI !== 'Contract source code not verified' ? JSON.parse(sourceData.ABI) : null,
    contractName: sourceData.ContractName,
    sourceCode: sourceData.SourceCode,
    bytecode: sourceData.ByteCode,
    constructorArguments: sourceData.ConstructorArguments,
    compilerVersion: sourceData.CompilerVersion,
    optimizationUsed: sourceData.OptimizationUsed,
    runs: sourceData.Runs,
    evmVersion: sourceData.EVMVersion,
    library: sourceData.Library,
    licenseType: sourceData.LicenseType,
    proxy: sourceData.Proxy,
    implementation: sourceData.Implementation,
    swarmSource: sourceData.SwarmSource
  };
}

/**
 * Create an ethers.js contract instance
 * 
 * @param address Contract address
 * @param abi Contract ABI
 * @param network Network name (default: 'sepolia')
 * @returns Ethers.js contract instance
 */
export function createContractInstance(
  address: string,
  abi: any,
  network: string = 'sepolia'
): ethers.Contract {
  // Create a provider for the specified network
  getNetworkConfig(network);
  const provider = new ethers.JsonRpcProvider(`https://${network}.infura.io/v3/your-infura-key`);
  
  // Create a contract instance
  return new ethers.Contract(address, abi, provider);
}

/**
 * Save contract data to files
 * 
 * @param outputPath The base path to save files to
 * @param contractData Contract data
 * @param address Contract address
 * @returns Paths to saved files
 */
export function saveContractData(
  outputPath: string,
  contractData: ContractSourceResult,
  address: string
): { sourcePath: string; abiPath: string; infoPath: string } {
  // Create output directory if it doesn't exist
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Determine filenames
  const baseName = path.basename(outputPath, '.sol');
  const sourcePath = path.join(outputDir, `${baseName}.sol`);
  const abiPath = path.join(outputDir, `${baseName}.abi.json`);
  const infoPath = path.join(outputDir, `${baseName}.info.json`);
  
  // Save source code
  fs.writeFileSync(sourcePath, contractData.sourceCode);
  
  // Save ABI
  if (contractData.abi) {
    fs.writeFileSync(abiPath, JSON.stringify(contractData.abi, null, 2));
  }
  
  // Save contract metadata
  const contractInfo = {
    address,
    name: contractData.contractName,
    compiler: contractData.compilerVersion,
    optimization: contractData.optimizationUsed,
    runs: contractData.runs,
    evmVersion: contractData.evmVersion,
    license: contractData.licenseType,
    isProxy: contractData.proxy === '1',
    implementation: contractData.implementation
  };
  
  fs.writeFileSync(infoPath, JSON.stringify(contractInfo, null, 2));
  
  return {
    sourcePath,
    abiPath,
    infoPath
  };
} 