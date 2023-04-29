export const isMac = () => navigator.userAgent.includes("Macintosh");
export const isWindows = () => !isMac();
export const formatNumber = (n: number) => n.toLocaleString();
