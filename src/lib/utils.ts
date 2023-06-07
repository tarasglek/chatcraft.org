export const isMac = () => navigator.userAgent.includes("Macintosh");
export const isWindows = () => !isMac();

export const formatNumber = (n: number) => (n ? n.toLocaleString() : "0");

export const formatCurrency = (n: number) =>
  Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);

export const formatDate = (d: Date) =>
  d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });

export function download(data: string | Blob, filename: string, type = "text/plain") {
  let blob;
  if (typeof data === "string") {
    blob = new Blob([data], { type });
  } else {
    blob = data;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.setAttribute("download", filename);
  anchor.setAttribute("href", url);
  anchor.click();
}
