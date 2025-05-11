import { Agent } from "../services/ai/mastra-shim.js";
import { z } from "zod";
import { VectorDB } from "../services/vector-db/vector-db.js";

/**
 * VectorStoreAgent - Retrieves relevant information from vector storage
 * 
 * This agent is responsible for querying the vector database to find
 * security patterns, code examples, and best practices for smart contracts.
 */
export class VectorStoreAgent {
  private agent: Agent;
  private vectorDB: VectorDB;
  
  constructor(model: string = "gpt-4o-mini") {
    this.agent = new Agent({
      name: "VectorStoreAgent",
      instructions:
        "You are a knowledge retrieval specialist for Solidity development." +
        "Create search queries for the vector database to find relevant:" +
        "- Security patterns\n" +
        "- Code examples\n" +
        "- Best practices\n" +
        "Your task is to formulate effective queries that will return the most helpful information.",
      model: model,
    });
    
    this.vectorDB = new VectorDB();
  }
  
  /**
   * Search the vector database for relevant information
   * 
   * @param query The search query
   * @param collection The vector database collection name
   * @param limit Maximum number of results to return
   * @returns Search results as text
   */
  async searchVectorStore(
    query: string, 
    collection: string = "security-patterns", 
    limit: number = 5
  ): Promise<string> {
    console.log(`Searching vector database for ${collection}...`);
    console.log(`[VectorStoreAgent] Finding relevant ${collection}`);
    
    try {
      // First, use the agent to optimize the search query
      const input = {
        originalQuery: query,
        collection: collection,
        context: `Need to find information about ${query} in the ${collection} collection`
      };
      
      // Call the agent to get optimized search queries
      const agentResponse = await this.agent.run(input);
      
      // Get optimized queries from agent or use original query
      const optimizedQueries = agentResponse.queries || [query];
      
      // Collect results from all queries
      let allResults = [];
      for (const optimizedQuery of Array.isArray(optimizedQueries) ? optimizedQueries : [optimizedQueries]) {
        const docs = await this.vectorDB.similaritySearch(collection, optimizedQuery, Math.ceil(limit / 2));
        allResults.push(...docs);
      }
      
      // Remove duplicates (if any)
      const uniqueResults = this.removeDuplicateResults(allResults);
      
      // Limit to requested number
      const finalResults = uniqueResults.slice(0, limit);
      
      console.log("✓ Vector search completed");
      
      if (finalResults.length > 0) {
        console.log(`[VectorStoreAgent] Found ${finalResults.length} relevant entries`);
        
        // Have the agent format and summarize the results if we have many
        if (finalResults.length > 3) {
          const formattingInput = {
            results: finalResults.map(d => d.pageContent),
            originalQuery: query
          };
          
          const formattingResponse = await this.agent.run(formattingInput);
          return formattingResponse.summary || finalResults.map(d => d.pageContent).join("\n\n");
        }
        
        return finalResults.map(d => d.pageContent).join("\n\n");
      } else {
        console.log("[VectorStoreAgent] No relevant entries found");
        return "No relevant information found in vector store.";
      }
    } catch (error) {
      console.error("❌ Vector search error:", error);
      return "Error searching vector store.";
    }
  }
  
  /**
   * Remove duplicate results based on content similarity
   * 
   * @param results The search results to deduplicate
   * @returns Deduplicated results
   */
  private removeDuplicateResults(results: any[]): any[] {
    const seen = new Set();
    return results.filter(doc => {
      // Create a signature of the document content (first 50 chars)
      const contentSignature = doc.pageContent?.substring(0, 50);
      if (!contentSignature || seen.has(contentSignature)) {
        return false;
      }
      seen.add(contentSignature);
      return true;
    });
  }
}

export const vectorStoreSchema = {
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    collection: z.string().optional().describe("Vector DB collection name"),
    limit: z.number().optional().describe("Maximum number of results"),
  }),
  outputSchema: z.object({
    results: z.string().describe("Vector search results"),
  })
}; 