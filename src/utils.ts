export const isMac = () => navigator.userAgent.includes("Macintosh");
export const isWindows = () => !isMac();
