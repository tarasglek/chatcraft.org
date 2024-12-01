// https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver

export const perfObserver = new PerformanceObserver((list, observer) => {
  list.getEntries().forEach((entry) => {
    if (entry.entryType === "mark") {
      console.log(`${entry.name}'s startTime: ${entry.startTime}`);
    }
    if (entry.entryType === "measure") {
      console.log(`${entry.name}'s duration: ${entry.duration}`);
    }
  });
});

export async function measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  
  performance.mark(startMark);
  try {
    const result = await fn();
    performance.mark(endMark);
    performance.measure(name, startMark, endMark);
    return result;
  } finally {
    // Clean up the marks
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
  }
}

perfObserver.observe({ entryTypes: ["measure", "mark"] });
