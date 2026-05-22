import type { SearchResults } from 'notion-types'
import { getBlockValue } from 'notion-utils'

/**
 * Notion's search API sometimes returns blocks nested as
 * `{ value: { value: block, role } }`. react-notion-x only unwraps one
 * `.value`, so titles fail to resolve and all results are dropped.
 */
export function normalizeSearchResults(
  results: SearchResults
): SearchResults {
  if (!results?.recordMap?.block) {
    return results
  }

  const block = Object.fromEntries(
    Object.entries(results.recordMap.block).map(([id, entry]) => {
      const value = getBlockValue(entry as any)
      if (!value) {
        return [id, entry]
      }

      return [id, { ...(entry as any), value }]
    })
  )

  return {
    ...results,
    recordMap: {
      ...results.recordMap,
      block
    }
  }
}
