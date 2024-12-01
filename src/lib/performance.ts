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
 * @param queryFn Function that returns the query result or Promise
 * @param deps Optional array of dependencies that trigger re-running the query
 * @param name Optional name for the performance trace (defaults to 'query')
 * @returns {T | undefined} The query result, undefined while loading
 * 
 * @example
 * const chat = useLiveQueryTraced<Chat | undefined>(
 *   () => Chat.find(id),
 *   [id],
 *   'find-chat'
 * );
 */
export function useLiveQueryTraced<T>(
  queryFn: () => Promise<T> | T,
  deps?: any[],
  name: string = 'query'
) {
  return useLiveQuery(
    () => measure(`${name}`, async () => {
      const result = await queryFn();
      return result;
    }),
    deps
  );
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
