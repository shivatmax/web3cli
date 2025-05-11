/**
 * Search Service
 * 
 * This module provides functionality for web search to gather context for 
 * smart contract generation.
 */

// In a real implementation, this would use an actual search API
// like Bing, Google, or a specialized Web3/blockchain search service

/**
 * Search result item
 */
export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Mock search results for demo purposes
 */
const MOCK_SEARCH_RESULTS: Record<string, SearchResultItem[]> = {
  'solidity erc20': [
    {
      title: 'ERC-20 Token Standard | ethereum.org',
      url: 'https://ethereum.org/en/developers/docs/standards/tokens/erc-20/',
      snippet: 'The ERC-20 introduces a standard for Fungible Tokens, in other words, they have a property that makes each Token be exactly the same in type and value as another Token.'
    },
    {
      title: 'OpenZeppelin Contracts: ERC20',
      url: 'https://docs.openzeppelin.com/contracts/4.x/erc20',
      snippet: 'OpenZeppelin Contracts provides implementations of ERC20 with different levels of complexity and control.'
    }
  ],
  'solidity security': [
    {
      title: 'Smart Contract Security Best Practices | Consensys',
      url: 'https://consensys.github.io/smart-contract-best-practices/',
      snippet: 'This document provides a baseline knowledge of security considerations for intermediate Solidity programmers. It is maintained by ConsenSys Diligence.'
    },
    {
      title: 'Smart Contract Weakness Classification (SWC) Registry',
      url: 'https://swcregistry.io/',
      snippet: 'The Smart Contract Weakness Classification Registry (SWC Registry) is an implementation of the weakness classification scheme proposed in EIP-1470.'
    }
  ]
};

/**
 * Get search results for a query
 * 
 * @param query The search query
 * @returns Formatted search results as text
 */
export async function getSearchResults(query: string): Promise<string> {
  console.log(`Searching for: ${query}`);
  
  // Look for matching key in mock results, or use default
  const key = Object.keys(MOCK_SEARCH_RESULTS).find(k => 
    query.toLowerCase().includes(k)
  ) || 'solidity security';
  
  const results = MOCK_SEARCH_RESULTS[key];
  
  // Format results as text
  return results.map(result => 
    `Title: ${result.title}\nURL: ${result.url}\n${result.snippet}\n`
  ).join('\n');
}

/**
 * For testing purposes only
 */
export function getMockSearchResult(query: string): Promise<string> {
  return getSearchResults(query);
} 