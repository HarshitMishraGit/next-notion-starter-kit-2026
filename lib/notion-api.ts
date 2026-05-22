import { NotionAPI } from 'notion-client'

export const notion = new NotionAPI({
  apiBaseUrl: process.env.NOTION_API_BASE_URL
})

/**
 * Wraps a Notion API call with exponential backoff retry for 429 rate-limit
 * errors. ofetch (used internally by notion-client) does not retry POST
 * requests by default, so we handle it at this layer instead.
 */
export async function notionWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  baseDelayMs = 2000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      const isRateLimited =
        err?.statusCode === 429 ||
        err?.status === 429 ||
        String(err?.message).includes('429')

      if (!isRateLimited || attempt === maxRetries) {
        throw err
      }

      const delay = baseDelayMs * 2 ** attempt + Math.random() * 500
      console.warn(
        `Notion rate limited (429), retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  // unreachable, but satisfies TypeScript
  throw new Error('notionWithRetry: exhausted retries')
}
