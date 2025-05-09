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
  // First try to match multiline code blocks with a language specifier
  const codeBlockWithLangRegex = /^```(?:solidity|javascript|js|typescript|ts)?\s*\n([\s\S]*?)\n```\s*$/m;
  let match = text.match(codeBlockWithLangRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Try to match any code block without a language specifier
  const anyCodeBlockRegex = /^```\s*\n([\s\S]*?)\n```\s*$/m;
  match = text.match(anyCodeBlockRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // If no code block markers found, return the original text
  return text;
} 