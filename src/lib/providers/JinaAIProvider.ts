import { NonLLMProviders } from "../ChatCraftProvider";
import { JinaAiReaderResponse } from "../ai";
import { getSettings } from "../settings";

const JINA_AI = "Jina AI";
const JINA_API_URL = "https://r.jina.ai/";

export class JinaAIProvider extends NonLLMProviders {
  constructor(apiKey?: string) {
    super(JINA_AI, JINA_API_URL, apiKey);
  }

  static fromSettings(): JinaAIProvider {
    const settings = getSettings();
    return (settings.nonLLMProviders["Jina AI"] as JinaAIProvider) || new JinaAIProvider();
  }

  get clientHeaders() {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    return headers;
  }
  async validateApiKey(key: string) {
    try {
      const response = await fetch("https://r.jina.ai/https://example.com", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async pdfToMarkdown(file: File): Promise<JinaAiReaderResponse> {
    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result !== "string") {
            throw new Error("Unable to read file");
          }

          const base64 = result.split(",")[1];
          if (typeof base64 === "string") {
            resolve(base64);
          } else {
            reject(new Error("Unable to read PDF file"));
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
      const jinaHeaders = this.clientHeaders;
      const res = await fetch("https://r.jina.ai/", {
        method: "POST",
        body: JSON.stringify({
          pdf: base64String,
        }),
        headers: {
          ...jinaHeaders,
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(`Error converting PDF file with Jina.ai Reader: ${error}`);
      }
      const result: JinaAiReaderResponse = await res.json();
      if (result.code !== 200) {
        throw new Error(`Error converting PDF file with Jina.ai Reader: got code ${result.code}`);
      }
      return result;
    } catch (err) {
      console.error(`Error converting PDF to markdown`, err);
      throw err;
    }
  }
}
