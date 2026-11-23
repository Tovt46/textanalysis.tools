import type { FrequencyCount } from "./comparison";

export type TermCounts = [string, number][];
export type ZipfCounts = { words: TermCounts; bigrams: TermCounts };

// Leave room for the analysis, settings and other entries in browser storage.
// Rows are already ordered by frequency. Missing rows in a partial snapshot
// stay unknown, including when reading baselines saved before snapshots existed.
function snapshot(rows: FrequencyCount[]): TermCounts {
  let remaining = 500_000;
  const entries: TermCounts = [];
  for (const { term, count } of rows) {
    remaining -= term.length + 18;
    if (remaining < 0) break;
    entries.push([term, count]);
  }
  return entries;
}

export function snapshotZipfCounts(words: FrequencyCount[], bigrams: FrequencyCount[]): ZipfCounts {
  return { words: snapshot(words), bigrams: snapshot(bigrams) };
}

function countLookup(visible: FrequencyCount[], snapshot: TermCounts | undefined, total: number) {
  const counts = new Map(snapshot);
  for (const { term, count } of visible) counts.set(term, count);
  let measured = 0;
  for (const count of counts.values()) measured += count;
  // Every word or bigram position contributes once to its table.
  return (term: string) => counts.get(term) ?? (measured === total ? 0 : null);
}

export function compareZipfTerms(
  a: FrequencyCount[], b: FrequencyCount[], totalA: number, totalB: number,
  countsA?: TermCounts, countsB?: TermCounts,
) {
  const lookupA = countLookup(a, countsA, totalA);
  const lookupB = countLookup(b, countsB, totalB);
  const candidates = new Set([...a.map(row => row.term), ...b.map(row => row.term)]);
  return [...candidates].map(term => {
    const countA = lookupA(term), countB = lookupB(term);
    const per1000A = countA === null ? null : 1000 * countA / totalA;
    const per1000B = countB === null ? null : 1000 * countB / totalB;
    const delta = per1000A === null || per1000B === null ? null : per1000B - per1000A;
    return {term, countA, countB, per1000A, per1000B, delta};
  }).sort((left, right) =>
    Math.max(right.per1000A ?? 0, right.per1000B ?? 0) -
    Math.max(left.per1000A ?? 0, left.per1000B ?? 0)
  ).slice(0, 30);
}
