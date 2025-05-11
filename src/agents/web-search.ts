import { Agent } from "../services/ai/mastra-shim.js";
import { z } from "zod";
import { getSearchResults } from "../services/search/search.js";

/**
 * WebSearchAgent - Searches the web for relevant information
 * 
 * This agent is responsible for gathering relevant information from the web
 * to enhance the context for smart contract generation.
 */
export class WebSearchAgent {
  private agent: Agent;
  
  constructor(model: string = "gpt-4o-mini") {
    this.agent = new Agent({
      name: "WebSearchAgent",
      instructions:
        "You are a web research specialist for Solidity development." +
        "Based on contract requirements, generate relevant search queries to find information about:" +
        "- Similar contract implementations\n" +
        "- Security best practices\n" +
        "- Design patterns\n" +
        "- Recent vulnerabilities or exploits\n" +
        "- Specific standards (ERC721, ERC1155, ERC2981, etc.)\n" +
        "- Gas optimization techniques\n" +
        "\n" +
        "Generate 3-5 specific and diverse search queries that will cover different aspects of the requirements.\n" +
        "For NFT collections, include searches for royalty implementations, metadata standards, minting patterns, and security considerations.\n" +
        "Always include at least one search query specifically about security best practices for the contract type.",
      model: model,
    });
  }
  
  /**
   * Search the web for relevant information
   * 
   * @param query The search query
   * @returns Search results as text
   */
  async searchWeb(query: string): Promise<string> {
    console.log("🔎 Searching the web for information...");
    console.log(`[WebSearchAgent] Searching for information about: ${query}`);
    
    try {
      // First, generate optimized search queries using the agent
      const input = {
        query: query,
        topic: "smart contract",
        requireSearchTerms: true,
        domainHints: [
          "NFTs", 
          "royalties", 
          "Solidity", 
          "OpenZeppelin", 
          "ERC721", 
          "ERC2981"
        ]
      };
      
      // Call the agent to get optimal search terms
      const agentResponse = await this.agent.run(input);
      
      // Get search terms from the agent or use default searches if agent fails
      let searchTerms = [];
      
      // Try different ways the agent might return search terms
      if (Array.isArray(agentResponse.searchTerms)) {
        searchTerms = agentResponse.searchTerms;
      } else if (typeof agentResponse.searchTerms === 'string') {
        searchTerms = agentResponse.searchTerms.split('\n').filter((term: string) => term.trim().length > 0);
      } else if (Array.isArray(agentResponse.queries)) {
        searchTerms = agentResponse.queries;
      } else if (typeof agentResponse.queries === 'string') {
        searchTerms = agentResponse.queries.split('\n').filter((term: string) => term.trim().length > 0);
      } else if (typeof agentResponse.output === 'string') {
        // Try to parse a list from the output
        const queryMatches = agentResponse.output.match(/["'](.+?)["']/g);
        if (queryMatches && queryMatches.length > 0) {
          searchTerms = queryMatches.map((m: string) => m.replace(/["']/g, ''));
        } else {
          searchTerms = agentResponse.output.split('\n')
            .filter((line: string) => line.trim().length > 10)
            .slice(0, 5);
        }
      }
      
      // Use default search terms if we couldn't get any from the agent
      if (!searchTerms || searchTerms.length === 0) {
        if (query.toLowerCase().includes('nft') && query.toLowerCase().includes('royalt')) {
          searchTerms = [
            "solidity ERC721 NFT collection with royalties example code",
            "ERC2981 royalties implementation OpenZeppelin",
            "NFT collection security best practices Solidity",
            "gas efficient NFT minting patterns Solidity",
            "NFT metadata standards and best practices"
          ];
        } else {
          // Generic fallback based on query
          searchTerms = [
            `solidity ${query} implementation example`,
            `${query} security best practices blockchain`,
            `${query} gas optimization Ethereum`,
            `OpenZeppelin ${query} implementation`
          ];
        }
      }
      
      console.log(`[WebSearchAgent] Generated search queries: ${searchTerms.join(', ')}`);
      
      // Perform searches for each term
      let allResults = "";
      let searchCount = 0;
      
      // Limit to max 5 search terms to avoid excessive searches
      const searchTermsToUse = searchTerms.slice(0, 5);
      
      for (const term of searchTermsToUse) {
        console.log(`[WebSearchAgent] Searching for: "${term}"`);
        const results = await getSearchResults(term);
        if (results && results.trim().length > 0) {
          allResults += `\n\n--- SEARCH RESULTS: "${term}" ---\n${results}`;
          searchCount++;
        }
      }
      
      console.log(`✓ Web search completed - ${searchCount} searches performed`);
      
      // Use the agent to summarize the search results if they're extensive
      if (allResults.length > 3000) {
        console.log(`[WebSearchAgent] Summarizing search results...`);
        const summaryInput = {
          searchResults: allResults,
          originalQuery: query,
          task: "summarize",
          format: "concise"
        };
        
        const summaryResponse = await this.agent.run(summaryInput);
        const summary = summaryResponse.summary || summaryResponse.output;
        
        if (summary && typeof summary === 'string' && summary.length > 100) {
          console.log(`[WebSearchAgent] Generated summary of search results`);
          return `SEARCH SUMMARY:\n${summary}\n\nFULL SEARCH RESULTS:\n${allResults}`;
        }
      }
      
      return allResults || "No relevant information found.";
    } catch (error) {
      console.error("❌ Web search error:", error);
      return `Error performing web search: ${error}. 
      
General information about NFT collections with royalties:
- ERC-721 is the standard for non-fungible tokens on Ethereum
- ERC-2981 is the royalty standard that allows marketplaces to identify royalty payments
- OpenZeppelin provides secure implementations of these standards
- Consider using ERC721Enumerable for collections that need on-chain enumeration
- Security best practices include access control, pausability, and input validation
- For royalties, implement the ERC2981 interface with royaltyInfo function`;
    }
  }
}

export const webSearchSchema = {
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
  outputSchema: z.object({
    results: z.string().describe("Search results"),
  })
}; 