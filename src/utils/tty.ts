/**
 * TTY Utilities
 * 
 * This module provides utilities for working with terminal input/output.
 */
import process from "node:process"
import tty from "node:tty"
import fs from "node:fs"

/**
 * Standard input stream
 */
export const stdin =
  process.stdin.isTTY || process.platform === "win32"
    ? process.stdin
    : new tty.ReadStream(fs.openSync("/dev/tty", "r"))

/**
 * Whether standard output is a TTY
 */
export const isOutputTTY = process.stdout.isTTY

/**
 * Read input from stdin pipe
 * 
 * @returns Piped input as string or undefined if no pipe
 */
export async function readPipeInput(): Promise<string | undefined> {
  // Check if data is being piped in
  if (process.stdin.isTTY || process.platform === "win32" && !process.stdin.isRaw) {
    return undefined;
  }

  return new Promise<string | undefined>((resolve) => {
    const chunks: Buffer[] = [];
    
    process.stdin.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    
    process.stdin.on("end", () => {
      const content = Buffer.concat(chunks).toString("utf8").trim();
      resolve(content.length ? content : undefined);
    });
    
    // Set a timeout in case stdin doesn't end
    setTimeout(() => {
      if (chunks.length) {
        const content = Buffer.concat(chunks).toString("utf8").trim();
        resolve(content);
      } else {
        resolve(undefined);
      }
    }, 100);
  });
}

/**
 * Check if the current process is running in a TTY
 * 
 * @returns True if running in a TTY
 */
export function isTTY(): boolean {
  return Boolean(process.stdout.isTTY);
}

/**
 * Get the width of the terminal
 * 
 * @returns Terminal width or default value
 */
export function getTerminalWidth(): number {
  return process.stdout.columns || 80;
} 