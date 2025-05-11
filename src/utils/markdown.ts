/**
 * Markdown Utilities
 * 
 * This module provides utilities for rendering markdown content in the terminal.
 */
import terminalLink from "terminal-link"
import { marked } from "marked"
import TerminalRenderer from "marked-terminal"

/**
 * Configure marked to use terminal renderer
 */
marked.setOptions({
  // @ts-ignore - Type mismatch but this is the correct usage per docs
  renderer: new TerminalRenderer()
})

/**
 * Render markdown content in the terminal
 * 
 * @param content Markdown content to render
 * @returns Rendered content
 */
export function renderMarkdown(content: string): string {
  try {
    // Cast to string since marked types include Promise<string> but in this usage it's synchronous
    return marked(content) as string
  } catch (error) {
    // If rendering fails, return the original content
    console.error("Error rendering markdown:", error)
    return content
  }
}

/**
 * Strip markdown code blocks from text
 * 
 * Removes ```solidity, ```javascript, ```js, etc. markers from code blocks,
 * returning just the code content. If no code block markers are found,
 * returns the original text.
 * 
 * @param text Text that might contain markdown code blocks
 * @returns Clean code without markdown formatting
 */
export function stripMarkdownCodeBlocks(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // Try multiple patterns to handle various markdown code block formats
  
  // 1. Try to match a code block with language specifier that spans the entire content
  // This is the most common when AI generates just the code
  const fullBlockWithLang = /^\s*```(?:solidity|javascript|js|typescript|ts)?\s*\n([\s\S]*?)\n```\s*$/;
  const fullMatch = text.match(fullBlockWithLang);
  if (fullMatch && fullMatch[1]) {
    return fullMatch[1].trim();
  }
  
  // 2. Look for any code block with a Solidity language specifier
  const solidityBlock = /```solidity\s*\n([\s\S]*?)\n```/g;
  let match;
  let largestBlock = '';
  
  while ((match = solidityBlock.exec(text)) !== null) {
    // Keep the largest matching block
    if (match[1] && match[1].length > largestBlock.length) {
      largestBlock = match[1].trim();
    }
  }
  
  if (largestBlock) {
    return largestBlock;
  }
  
  // 3. Look for any code block (with or without a language specifier)
  const anyCodeBlock = /```(?:\w*)?\s*\n([\s\S]*?)\n```/g;
  largestBlock = '';
  
  while ((match = anyCodeBlock.exec(text)) !== null) {
    // For multiple code blocks, prefer ones that look like Solidity
    const isLikelySolidity = match[1] && (
      match[1].includes('pragma solidity') || 
      match[1].includes('contract ') ||
      match[1].includes('SPDX-License-Identifier')
    );
    
    // Keep the largest matching block that is likely Solidity
    if (match[1] && (isLikelySolidity || largestBlock === '') && match[1].length > largestBlock.length) {
      largestBlock = match[1].trim();
    }
  }
  
  if (largestBlock) {
    return largestBlock;
  }
  
  // 4. If we still don't have a match, check if the text itself contains Solidity code
  // without markdown markers (sometimes AI just outputs the code)
  if (text.includes('pragma solidity') || text.includes('contract ') || text.includes('SPDX-License-Identifier')) {
    // If it looks like raw Solidity code, return the whole text
    return text.trim();
  }
  
  // 5. If all else fails, return the original text
  return text.trim();
} 