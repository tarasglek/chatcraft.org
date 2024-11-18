import { compressImageToBase64, formatAsCodeBlock } from "./utils";
import { getSettings } from "./settings";
import { JinaAiReaderResponse } from "./ai";
import { JinaAIProvider } from "./providers/JinaAIProvider";

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

export function textFileToMarkdownCodeBlock(
  filename: string,
  type: string,
  content: string
): string {
  // Common programming language extensions and their markdown identifiers
  const codeBlockMap: Record<string, string> = {
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

  // MIME type mappings for common programming languages
  const mimeTypeMap: Record<string, string> = {
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

  // Get file extension
  const extension = filename.split(".").pop()?.toLowerCase() || "";

  // Try to determine language from extension or MIME type
  const languageFromExt = extension ? codeBlockMap[extension] : undefined;
  const languageFromMime = mimeTypeMap[type];
  const language = languageFromExt || languageFromMime;

  // If we found a matching language, wrap in code block
  if (language) {
    return formatAsCodeBlock(content, language);
  }

  // Default: return content as-is
  return content;
}

type ImportFilesOptions = {
  onFile: (file: File, contents: string | JinaAiReaderResponse) => void;
  onProgress?: (progress: number) => void;
  onError?: (file: File, err: Error) => void;
};

export async function importFiles(
  files: FileList | File[],
  { onFile, onProgress, onError }: ImportFilesOptions
) {
  const settings = getSettings();

  let processed = 0;
  for (const file of files) {
    try {
      console.log(file);
      if (file.type.startsWith("image/")) {
        const base64 = await compressImageToBase64(file, {
          compressionFactor: settings.compressionFactor,
          maxSizeMB: settings.maxCompressedFileSizeMB,
          maxWidthOrHeight: settings.maxImageDimension,
        });
        onFile(file, base64);
      } else if (file.type === "application/pdf") {
        const jinaAIProvider =
          (settings.nonLLMProviders["Jina AI"] as JinaAIProvider) || new JinaAIProvider();
        const markdown = await jinaAIProvider.pdfToMarkdown(file);
        onFile(file, markdown);
      } else if (file.type === "application/markdown" || file.type === "text/markdown") {
        const markdown = await readTextFile(file);
        onFile(file, markdown);
      } else if (file.type.startsWith("text/") || file.type === "application/json") {
        const text = await readTextFile(file);
        const markdown = textFileToMarkdownCodeBlock(file.name, file.type, text);
        onFile(file, markdown);
      } else {
        throw new Error(`Unable to import file: ${file.name} (${file.type})`);
      }
    } catch (err: any) {
      console.error(err);
      if (onError) {
        onError(file, err);
      }
    } finally {
      if (onProgress) {
        onProgress(Math.floor((processed++ * 100) / files.length));
      }
    }
  }
}
