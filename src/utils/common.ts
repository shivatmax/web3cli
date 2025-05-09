/**
 * Common Utilities
 * 
 * This module provides common utility functions used throughout the application.
 */
import fs from "node:fs"
import glob from "fast-glob"
import { exec } from "node:child_process"

/**
 * Check if a value is not empty
 * 
 * @param value The value to check
 * @returns True if the value is not empty
 */
export function notEmpty<TValue>(
  value: TValue | null | undefined | "" | false
): value is TValue {
  return (
    value !== null && value !== undefined && value !== "" && value !== false
  )
}

/**
 * Load files from globs
 * 
 * @param files Files glob pattern
 * @returns Array of files with name and content
 */
export async function loadFiles(
  files: string | string[]
): Promise<{ name: string; content: string }[]> {
  if (!files || files.length === 0) return []

  const filenames = await glob(files, { onlyFiles: true })

  return await Promise.all(
    filenames.map(async (name) => {
      const content = await fs.promises.readFile(name, "utf8")
      return { name, content }
    })
  )
}

/**
 * Run a shell command
 * 
 * @param command The command to run
 * @returns Command output
 */
export async function runCommand(command: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const cmd = exec(command)
    let output = ""
    cmd.stdout?.on("data", (data) => {
      output += data
    })
    cmd.stderr?.on("data", (data) => {
      output += data
    })
    cmd.on("close", () => {
      resolve(output)
    })
    cmd.on("error", (error) => {
      reject(error)
    })
  })
} 