const PERF_PREFIX = "--chatcraft-";

type PerfStats = {
  operations: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  lastDuration: number;
};

// Use a Map to store running statistics
const measurements = new Map<string, PerfStats>();

// Update stats for a measurement
function updateStats(name: string, duration: number) {
  const stats = measurements.get(name) || {
    operations: 0,
    totalDuration: 0,
    minDuration: Infinity,
    maxDuration: -Infinity,
    lastDuration: 0,
  };

  stats.operations++;
  stats.totalDuration += duration;
  stats.minDuration = Math.min(stats.minDuration, duration);
  stats.maxDuration = Math.max(stats.maxDuration, duration);
  stats.lastDuration = duration;

  measurements.set(name, stats);
}

// Refactored observer to use shared code
export const perfObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (!entry.name.startsWith(PERF_PREFIX)) return;

    if (entry.entryType === "measure") {
      const name = entry.name.replace(PERF_PREFIX, "");
      updateStats(name, entry.duration);
      console.log(`${entry.name}'s duration: ${entry.duration}`);
    }
  });
});

/**
 * Get all performance measurements collected so far
 * @returns Map of operation names to their statistics
 */
export function getPerformanceStats(): Map<string, PerfStats> {
  return new Map(measurements);
}

import { useLiveQuery } from "dexie-react-hooks";

/**
 * A custom React hook that wraps useLiveQuery with performance tracing.
 * Measures execution time of the query function.
 *
 * Usage:
 * const result = useLiveQueryTraced("name", queryFn, deps, defaultValue)
 *
 * @template T The type of data returned by the query
 * @template TDefault The type of the default value
 * @param name Name for the performance trace
 * @param queryFn Function that returns the query result or Promise
 * @param deps Optional array of dependencies
 * @param defaultValue Optional default value while loading
 * @returns The query result or default value
 */
export function useLiveQueryTraced<T, TDefault = T>(
  name: string,
  queryFn: () => Promise<T> | T,
  deps: any[] = [],
  defaultValue?: TDefault
): T | TDefault {
  return useLiveQuery(
    () =>
      measure(name, async () => {
        const result = await queryFn();
        return result;
      }),
    deps,
    defaultValue
  ) as T | TDefault;
}

export async function measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const fullName = `${PERF_PREFIX}${name}`;
  const startMark = `${fullName}-start`;
  const endMark = `${fullName}-end`;

  performance.mark(startMark);
  try {
    const result = await fn();
    performance.mark(endMark);
    performance.measure(fullName, startMark, endMark);
    return result;
  } finally {
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
  }
}

perfObserver.observe({ entryTypes: ["measure", "mark"] });
