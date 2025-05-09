/**
 * Contract Fetcher Service
 * 
 * This module provides functionality for fetching contract information
 * from the blockchain using ethers.js.
 */
import { ethers } from "ethers";
import { loadConfig } from "../config/config";
import { CliError } from "../../utils/error";

/**
 * Contract data structure
 */
export interface ContractData {
  address: string;
  abi?: Array<any>;
  bytecode?: string;
  source?: string;
  contractName?: string;
  isVerified: boolean;
  network: string;
}

/**
 * Fetch contract data from the blockchain
 * 
 * @param address Contract address
 * @param network Network name (e.g., 'sepolia', 'mainnet')
 * @returns Contract data including ABI and bytecode
 */
export async function fetchContractData(address: string, network: string = 'sepolia'): Promise<ContractData> {
  console.log(`Fetching contract data for ${address} on ${network}...`);
  
  const config = loadConfig();
  const etherscanApiKey = config.etherscan_api_key;
  
  if (!ethers.isAddress(address)) {
    throw new CliError(`Invalid Ethereum address: ${address}`);
  }
  
  // Define provider based on network
  let provider: ethers.Provider;
  let etherscanProvider: ethers.EtherscanProvider;
  
  try {
    // Set up the appropriate network provider
    switch (network.toLowerCase()) {
      case 'sepolia':
        // Use default provider instead of hardcoded Infura URL
        provider = ethers.getDefaultProvider('sepolia');
        etherscanProvider = new ethers.EtherscanProvider('sepolia', etherscanApiKey);
        break;
      case 'goerli':
        provider = ethers.getDefaultProvider('goerli');
        etherscanProvider = new ethers.EtherscanProvider('goerli', etherscanApiKey);
        break;
      case 'mainnet':
        provider = ethers.getDefaultProvider('mainnet');
        etherscanProvider = new ethers.EtherscanProvider('mainnet', etherscanApiKey);
        break;
      default:
        provider = ethers.getDefaultProvider('sepolia');
        etherscanProvider = new ethers.EtherscanProvider('sepolia', etherscanApiKey);
        break;
    }
    
    // Initialize contract data
    const contractData: ContractData = {
      address,
      isVerified: false,
      network
    };
    
    // First, try to get the bytecode
    const bytecode = await provider.getCode(address);
    if (bytecode === '0x') {
      throw new CliError(`No contract found at address ${address} on ${network}`);
    }
    contractData.bytecode = bytecode;
    
    // Try to get contract source code and ABI from Etherscan
    try {
      // Fetch contract metadata from Etherscan
      const contractMetadata = await etherscanProvider.getContract(address);
      
      if (contractMetadata) {
        contractData.isVerified = true;
        // Convert interface fragments to array
        contractData.abi = contractMetadata.interface.fragments.map(fragment => ({...fragment}));
        
        // In ethers.js v6, name could be a method or a string property
        if (typeof contractMetadata.name === 'function') {
          // If it's a function, await the result
          try {
            contractData.contractName = await contractMetadata.name();
          } catch (error) {
            contractData.contractName = 'UnknownContract';
          }
        } else {
          // Otherwise use the string value
          contractData.contractName = contractMetadata.name || 'UnknownContract';
        }
        
        // Additional attempt to get the full contract source
        try {
          const sourceUrl = `https://api${network !== 'mainnet' ? `-${network}` : ''}.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${etherscanApiKey}`;
          const response = await fetch(sourceUrl);
          const data = await response.json();
          
          if (data.status === '1' && data.result?.length > 0) {
            contractData.source = data.result[0].SourceCode;
          }
        } catch (error) {
          console.warn('Could not fetch contract source code');
        }
      }
    } catch (error) {
      console.warn('Contract is not verified on Etherscan or could not fetch ABI');
    }
    
    return contractData;
  } catch (error: unknown) {
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError(`Error fetching contract data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get formatted contract information as a string
 * 
 * @param contractData Contract data
 * @returns Formatted contract information
 */
export function formatContractData(contractData: ContractData): string {
  const output: string[] = [];
  
  output.push(`// Contract Address: ${contractData.address}`);
  output.push(`// Network: ${contractData.network}`);
  output.push(`// Verified: ${contractData.isVerified ? 'Yes' : 'No'}`);
  
  if (contractData.contractName) {
    output.push(`// Contract Name: ${contractData.contractName}`);
  }
  
  // Include bytecode information
  output.push('\n// Bytecode:');
  output.push(`// ${contractData.bytecode?.substring(0, 64)}...`);
  
  // If we have source code, use it
  if (contractData.source) {
    output.push('\n// Full Source Code:');
    output.push(contractData.source);
  } 
  // Otherwise include ABI if available
  else if (contractData.abi) {
    output.push('\n// ABI:');
    output.push('/*');
    output.push(JSON.stringify(contractData.abi, null, 2));
    output.push('*/');
    
    // Try to reconstruct interface from ABI
    output.push('\n// Reconstructed Interface:');
    try {
      // Add events
      for (const fragment of contractData.abi) {
        if (fragment.type === 'event') {
          const inputs = fragment.inputs?.map((input: any) => 
            `${input.type} ${input.indexed ? 'indexed ' : ''}${input.name || ''}`
          ).join(', ') || '';
          
          output.push(`event ${fragment.name}(${inputs});`);
        }
      }
      
      // Add functions
      for (const fragment of contractData.abi) {
        if (fragment.type === 'function') {
          const inputs = fragment.inputs?.map((input: any) => 
            `${input.type} ${input.name || ''}`
          ).join(', ') || '';
          
          const stateMutability = fragment.stateMutability ? ` ${fragment.stateMutability}` : '';
          
          const outputs = fragment.outputs?.map((output: any) => 
            `${output.type} ${output.name || ''}`
          ).join(', ') || '';
          
          const returns = outputs ? ` returns (${outputs})` : '';
          
          output.push(`function ${fragment.name}(${inputs})${stateMutability}${returns};`);
        }
      }
    } catch (e) {
      output.push('// Could not reconstruct interface');
    }
  } else {
    output.push('\n// Contract is not verified. Only bytecode is available.');
  }
  
  return output.join('\n');
} 