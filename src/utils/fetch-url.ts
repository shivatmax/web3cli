/**
 * URL Fetching Utilities
 * 
 * This module provides utilities for fetching content from URLs.
 */

/**
 * Fetch content from URLs
 * 
 * @param urls URLs to fetch
 * @returns Array of URL and content pairs
 */
export async function fetchUrl(
  urls: string | string[]
): Promise<{ url: string; content: string }[]> {
  if (!urls || (Array.isArray(urls) && urls.length === 0)) return []

  const urlArray = Array.isArray(urls) ? urls : [urls]
  return await Promise.all(
    urlArray.map(async (url) => {
      const resp = await fetch(url)
      const content = await resp.text()
      return { url, content }
    })
  )
} 