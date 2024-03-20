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

// Make sure image's size is within 20MB and 2048x2048 resolution
// https://platform.openai.com/docs/guides/vision/is-there-a-limit-to-the-size-of-the-image-i-can-upload
export const compressImageToBase64 = (
  file: File,
  compressionFactor: number = 1,
  maxCompressedFileSizeMb: number = 20
): Promise<string> => {
  const imageCompressionOptions = {
    maxSizeMB: Math.min((file.size / 1024 / 1024) * compressionFactor, maxCompressedFileSizeMb, 20),
    maxWidthOrHeight: 2048,
  };

  console.log(imageCompressionOptions);
  return import("browser-image-compression")
    .then((imageCompressionModule) => {
      const imageCompression = imageCompressionModule.default;
      return imageCompression(file, imageCompressionOptions);
    })
    .then((compressedFile: File) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(compressedFile);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          resolve(base64data);
        };
        reader.onerror = (error) => {
          reject(error);
        };
      });
    })
    .catch((err) => {
      console.error("Error processing images", err);
      throw err;
    });
};

export const updateImageUrls = (
  base64String: string,
  setInputImageUrls: React.Dispatch<React.SetStateAction<string[]>>
): void => {
  setInputImageUrls((prevImageUrls) => {
    if (base64String) {
      const newImageUrls = [...prevImageUrls];
      const placeholderIndex = prevImageUrls.indexOf("");
      if (placeholderIndex !== -1) {
        // Replace the first placeholder with the actual base64 string
        newImageUrls[placeholderIndex] = base64String;
      } else {
        return [...prevImageUrls, base64String];
      }
      return newImageUrls;
    } else {
      //set imageUrl "" as placeholder
      return [...prevImageUrls, ""];
    }
  });
};
