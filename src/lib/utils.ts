export const isMac = () => navigator.userAgent.includes("Macintosh");
export const isWindows = () => !isMac();

export const formatNumber = (n: number) => (n ? n.toLocaleString() : "0");

export const formatCurrency = (n: number) =>
  Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);

export const formatSeconds = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  const minutesString = minutes < 10 ? "0" + minutes : minutes.toString();
  const secondsString: string =
    remainingSeconds < 10 ? "0" + remainingSeconds : remainingSeconds.toString();

  return `${minutesString}:${secondsString}`;
};

export const formatDate = (d: Date, short = false) =>
  short
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "short",
      }).format(d)
    : new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      }).format(d);

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

export const getReferer = () => {
  const { origin } = location;
  // Don't report development urls upstream
  if (origin.includes("localhost") || origin.includes("overthinker-dev.pages.dev")) {
    return "https://chatcraft.org/";
  }
  return `${origin}/`;
};

export const formatAsCodeBlock = (code: string, language = "text") =>
  `\`\`\`${language}\n${code}\n\`\`\``;

export const isProd = () => location.origin === "https://chatcraft.org";
export const isDev = () => !isProd();

export const getMetaKey = () => (isMac() ? "Command ⌘" : "Ctrl");

export const screenshotElement = (element: HTMLElement): Promise<Blob> => {
  return import("html2canvas")
    .then((module) => {
      const html2canvas = module.default;
      return html2canvas(element, {
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });
    })
    .then(
      (canvas) =>
        new Promise((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error("Unable to screenshot element"));
              return;
            }
            resolve(blob);
          });
        })
    );
};
