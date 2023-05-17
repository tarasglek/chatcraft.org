export const isMac = () => navigator.userAgent.includes("Macintosh");
export const isWindows = () => !isMac();

export const formatNumber = (n: number) => n.toLocaleString();

export const formatCurrency = (n: number) =>
  Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);

let current = Date.now();
export const unique = () => String(current++);
