const PERF_PREFIX = "--chatcraft-";

// https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver

export const perfObserver = new PerformanceObserver((list, observer) => {
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
 * Wrapper for Dexie's useLiveQuery that adds performance measurement.
 * Automatically traces query execution time using the performance API.
 * 
 * @template T The type of data returned by the query
 * @template TDefault The type of the default value
 * @param queryFn Function that returns the query result or Promise
 * @param deps Optional array of dependencies that trigger re-running the query 
 * @param defaultValue Optional default value to return while loading
 * @param name Optional name for the performance trace (defaults to 'query')
 * @returns {T | TDefault} The query result, or defaultValue while loading
 */
/**
 * Creates a traced version of useLiveQuery that measures performance.
 * Uses several TypeScript/JS tricks:
 * 1. Function currying - returns a new function that wraps useLiveQuery
 * 2. typeof operator - copies useLiveQuery's exact type signature
 * 3. Rest parameters (...args) - captures all arguments as an array
 * 4. Spread operator - forwards all remaining args unchanged
 * 
 * Usage:
 * const result = useLiveQueryTraced<Type>("name")(queryFn, deps, defaultValue)
 * 
 * @template T The type of data returned by the query
 * @template TDefault The type of the default value
 * @param name Name for the performance trace
 * @returns A wrapped version of useLiveQuery that traces performance
 */
export function useLiveQueryTraced<T, TDefault = undefined>(
  name: string
): typeof useLiveQuery<T, TDefault> {
  return function(...args) {
    const queryFn = args[0];
    return useLiveQuery(
      () => measure(`${name}`, async () => {
        const result = await queryFn();
        return result;
      }),
      ...args.slice(1)
    );
  };
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
