import { Agent } from "../services/ai/mastra-shim";
import { z } from "zod";
import { getSearchResults } from "../services/search/search";

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
        "Return a concise summary of the most relevant information found.",
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
      // This would call the actual search service in production
      const results = await getSearchResults(query);
      console.log("✓ Web search completed");
      
      return results || "No relevant information found.";
    } catch (error) {
      console.error("❌ Web search error:", error);
      return "Error performing web search.";
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