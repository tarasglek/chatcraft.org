import { useCallback } from "react";
import { useAlert } from "./use-alert";
import { ChatCraftChat } from "../lib/ChatCraftChat";
import { ChatCraftHumanMessage } from "../lib/ChatCraftMessage";
import { JinjaReaderResponse, pdfToMarkdown } from "../lib/ai";
import { compressImageToBase64, formatAsCodeBlock } from "../lib/utils";
import { getSettings } from "../lib/settings";

function readTextFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error(`Unable to read text from file ${file.name}`));
      }
    };
    reader.readAsText(file, "utf-8");
  });
}

function readBinaryFile(file: File) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (result instanceof ArrayBuffer) {
        resolve(result);
      } else {
        reject(new Error(`Unable to read binary file ${file.name}`));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

async function readWordDocx(docx: File) {
  try {
    const mammoth = await import("mammoth");
    const arrayBuffer = await readBinaryFile(docx);
    console.log({ arrayBuffer });
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        // TODO: how should we handle inline images?  Strip them out for now (too many tokens)
        // https://github.com/mwilliamson/mammoth.js/?tab=readme-ov-file#image-converters
        convertImage: mammoth.images.imgElement(async () => ({
          src: "",
        })),
      }
    );
    console.log({ result });
    const html = result.value;

    // TODO: this isn't working, not sure why...
    // const markdown = await htmlToMarkdown(html);
    // return markdown;

    // TODO: return the HTML until we can get proper Markdown
    return html;
  } catch (err: any) {
    console.error("Error reading DOCX", err);
    throw new Error("Unable to parse DOCX file: " + err.message);
  }
}

const FILE_EXTENSIONS: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  rb: "ruby",
  java: "java",
  cpp: "cpp",
  c: "c",
  cs: "csharp",
  go: "go",
  rs: "rust",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  scala: "scala",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  sql: "sql",
  sh: "bash",
  yaml: "yaml",
  yml: "yaml",
  json: "json",
  xml: "xml",
};

const MIME_TYPES: Record<string, string> = {
  "text/typescript": "typescript",
  "application/typescript": "typescript",
  "text/javascript": "javascript",
  "application/javascript": "javascript",
  "text/python": "python",
  "text/x-python": "python",
  "text/x-ruby": "ruby",
  "text/java": "java",
  "text/x-c": "c",
  "text/x-c++": "cpp",
  "text/x-csharp": "csharp",
  "text/x-go": "go",
  "text/x-rust": "rust",
  "text/x-php": "php",
  "text/x-swift": "swift",
  "text/x-kotlin": "kotlin",
  "text/html": "html",
  "text/css": "css",
  "text/x-sql": "sql",
  "application/json": "json",
  "text/xml": "xml",
  "application/xml": "xml",
};

function detectLanguage(filename: string, mimeType: string): string | undefined {
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  return FILE_EXTENSIONS[extension] || MIME_TYPES[mimeType];
}

function formatTextContent(filename: string, type: string, content: string): string {
  const language = detectLanguage(filename, type);
  return formatAsCodeBlock(content, language);
}

async function processFile(
  file: File,
  settings: ReturnType<typeof getSettings>
): Promise<string | JinjaReaderResponse> {
  if (file.type.startsWith("image/")) {
    return await compressImageToBase64(file, {
      compressionFactor: settings.compressionFactor,
      maxSizeMB: settings.maxCompressedFileSizeMB,
      maxWidthOrHeight: settings.maxImageDimension,
    });
  }

  if (file.type === "application/pdf") {
    return await pdfToMarkdown(file);
  }

  if (file.type === "application/markdown" || file.type === "text/markdown") {
    return readTextFile(file);
  }

  if (file.type.startsWith("text/") || file.type === "application/json") {
    const text = await readTextFile(file);
    return formatTextContent(file.name, file.type, text);
  }

  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return readWordDocx(file);
  }

  throw new Error(`Unsupported file type: ${file.name} (${file.type})`);
}

type UseFileImportOptions = {
  chat: ChatCraftChat;
  // We (currently) handle images differently, placing them in the prompt vs. a message
  onImageImport: (base64: string) => void;
};

export function useFileImport({ chat, onImageImport }: UseFileImportOptions) {
  const { error, progress, closeToast } = useAlert();
  const settings = getSettings();

  const importFile = useCallback(
    (file: File, contents: string | JinjaReaderResponse) => {
      if (file.type.startsWith("image/")) {
        const base64 = contents as string;
        onImageImport(base64);
      } else if (file.type === "application/pdf") {
        const document = (contents as JinjaReaderResponse).data;
        chat.addMessage(new ChatCraftHumanMessage({ text: `${document.content}\n` }));
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        // TODO: need to get HTML -> Markdown working
        // const document = (contents as JinjaReaderResponse).data;
        console.log("contents", contents);
        const document = contents as string;
        chat.addMessage(new ChatCraftHumanMessage({ text: `${document}\n` }));
      } else {
        const document = contents as string;
        chat.addMessage(new ChatCraftHumanMessage({ text: `${document}\n` }));
      }
    },
    [chat, onImageImport]
  );

  const importFiles = useCallback(
    async (files: File[]) => {
      if (!files?.length) {
        return;
      }

      let processed = 0;
      const progressId = progress({
        title: `Processing file${files.length > 1 ? "s" : ""}`,
        progressPercentage: 0,
      });

      try {
        for (const file of files) {
          try {
            const contents = await processFile(file, settings);
            importFile(file, contents);
          } catch (err: any) {
            error({ title: "Unable to import file", message: err.message });
          } finally {
            progress({
              id: progressId,
              title: `Processing file${files.length > 1 ? "s" : ""}`,
              progressPercentage: Math.floor((++processed * 100) / files.length),
              updateOnly: true,
            });
          }
        }
      } finally {
        closeToast(progressId);
      }
    },
    [closeToast, error, progress, importFile, settings]
  );

  return importFiles;
}
