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

export function useLiveQueryTraced<T>(
  queryFn: () => Promise<T> | T,
  deps?: any[],
  name: string = "query"
) {
  return useLiveQuery(
    () =>
      measure(`${name}`, async () => {
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
