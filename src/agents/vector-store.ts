import { Agent } from "../services/ai/mastra-shim";
import { z } from "zod";
import { VectorDB } from "../services/vector-db/vector-db";

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
      const docs = await this.vectorDB.similaritySearch(collection, query, limit);
      console.log("✓ Vector search completed");
      
      if (docs.length > 0) {
        console.log(`[VectorStoreAgent] Found ${docs.length} relevant entries`);
        return docs.map(d => d.text).join("\n\n");
      } else {
        console.log("[VectorStoreAgent] No relevant entries found");
        return "No relevant information found in vector store.";
      }
    } catch (error) {
      console.error("❌ Vector search error:", error);
      return "Error searching vector store.";
    }
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