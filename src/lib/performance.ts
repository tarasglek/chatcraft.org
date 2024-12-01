const PERF_PREFIX = "--chatcraft-";

// https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver

export const perfObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (!entry.name.startsWith(PERF_PREFIX)) return;

    if (entry.entryType === "mark") {
      // console.log(`${entry.name}'s startTime: ${entry.startTime}`);
    }
    if (entry.entryType === "measure") {
      console.log(`${entry.name}'s duration: ${entry.duration}`);
    }
  });
});

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
    () => measure(name, async () => {
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
