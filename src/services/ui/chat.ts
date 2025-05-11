/**
 * Chat Interface
 * 
 * This module provides a simple chat interface for the CLI.
 */
import logUpdate from "log-update"
import cliCursor from "cli-cursor"

/**
 * Create a chat interface
 * 
 * @returns Chat interface with methods to render messages
 */
export function createChat() {
  cliCursor.hide()

  function clear() {
    logUpdate("")
  }

  function render(message: string) {
    logUpdate(`${message}`)
  }

  function done() {
    logUpdate.done()
    cliCursor.show()
  }

  return { render, clear, done }
} 