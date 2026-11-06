import { generateKeyBetween } from 'fractional-indexing'

/** Byte-order compare (matches Firestore's orderBy on strings). */
export const compareRank = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/**
 * A rank strictly between two neighbours. Moving a card only rewrites that one card.
 * Falls back gracefully if neighbours are out of order (e.g. two concurrent inserts got the same rank).
 */
export function rankBetween(before: string | null, after: string | null): string {
  try {
    return generateKeyBetween(before, after)
  } catch {
    return generateKeyBetween(before, null)
  }
}
