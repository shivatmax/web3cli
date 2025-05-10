/**
 * Retrieval Augmented Generation (RAG) Utilities
 * 
 * This module provides utilities for integrating the vector database
 * with AI queries for retrieval-augmented generation.
 */
import { VectorDB } from '../vector-db/vector-db';
import { loadConfig } from '../config/config';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

/**
 * Get relevant content from a collection for a query
 * 
 * @param query The query to search for
 * @param collectionName The collection to search in
 * @param k Number of results to retrieve
 * @returns Formatted context string
 */
export async function getRelevantContent(
  query: string,
  collectionName: string,
  k: number = 5
): Promise<string> {
  const db = new VectorDB();
  
  try {
    const results = await db.search(collectionName, query, k);
    
    if (results.length === 0) {
      return '';
    }
    
    // Format results into a single context string
    let context = `## Relevant information from ${collectionName} documentation:\n\n`;
    
    results.forEach((doc, i) => {
      const source = doc.metadata?.source || 'Unknown source';
      context += `### Source: ${source}\n\n${doc.pageContent}\n\n---\n\n`;
    });
    
    return context;
  } catch (error) {
    console.error(`Error retrieving content from collection '${collectionName}':`, error);
    return '';
  }
}

/**
 * Augment messages with relevant content from vector database
 * 
 * @param messages Array of chat messages
 * @param query Search query
 * @param collectionNames Collections to search in
 * @returns Augmented messages array
 */
export async function augmentMessagesWithRAG(
  messages: ChatCompletionMessageParam[],
  query: string,
  collectionNames: string[] | string
): Promise<ChatCompletionMessageParam[]> {
  // Convert single collection name to array
  const collections = Array.isArray(collectionNames) ? collectionNames : [collectionNames];
  
  // Get relevant content from each collection
  const contextPromises = collections.map(name => getRelevantContent(query, name));
  const contextResults = await Promise.all(contextPromises);
  
  // Filter out empty results and combine
  const combinedContext = contextResults.filter(Boolean).join('\n\n');
  
  if (!combinedContext) {
    return messages;
  }
  
  // Create a new message array with context inserted before the user query
  const augmentedMessages: ChatCompletionMessageParam[] = [...messages];
  
  // Find the last user message
  const lastUserMsgIndex = augmentedMessages.findIndex(
    (msg, i, arr) => msg.role === 'user' && (i === arr.length - 1 || arr[i + 1].role !== 'user')
  );
  
  if (lastUserMsgIndex !== -1) {
    // If we found a user message, augment it with context
    const userMsg = augmentedMessages[lastUserMsgIndex];
    const userContent = typeof userMsg.content === 'string' ? userMsg.content : '';
    
    augmentedMessages[lastUserMsgIndex] = {
      ...userMsg,
      content: `${userContent}\n\nHere's some relevant information to help you answer:\n\n${combinedContext}`
    };
  }
  
  return augmentedMessages;
}

/**
 * Process a vector database reading request
 * 
 * @param query The query to process
 * @param collectionName The collection name to read from
 * @param k Number of results to retrieve
 * @returns Message string with retrieved content
 */
export async function processVectorDBReadRequest(
  query: string,
  collectionName: string,
  k: number = 5
): Promise<string> {
  try {
    const content = await getRelevantContent(query, collectionName, k);
    
    if (!content) {
      return `No relevant information found in collection '${collectionName}' for query: ${query}`;
    }
    
    return content;
  } catch (error: any) {
    return `Error retrieving information: ${error.message || error}`;
  }
} 