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

perfObserver.observe({ entryTypes: ["measure", "mark"] });
