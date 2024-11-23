import { NonLLMProviders } from "../ChatCraftProvider";
import { getSettings } from "../settings";

const JINA_AI = "Jina AI";
const JINA_API_URL = "https://r.jina.ai/";

export type JinaAiReaderResponse = {
  code: number;
  status: number;
  data: {
    content: string;
    description?: string;
    title?: string;
    url?: string;
  };
  usage: {
    tokens: number;
  };
};

export class JinaAIProvider extends NonLLMProviders {
  constructor(apiKey?: string) {
    super(JINA_AI, JINA_API_URL, apiKey);
  }

  static fromSettings(): JinaAIProvider {
    const settings = getSettings();
    const provider = settings.nonLLMProviders["Jina AI"];

    // case 1 when the provider already exists in the settings
    if (provider instanceof JinaAIProvider) {
      return provider;
    }
    // case 2 when the provider doesn't exist but the api key is set
    if (provider?.apiKey) {
      return new JinaAIProvider(provider.apiKey);
    }

    // case 3 when the provider doesn't exist and the api key is not set
    return new JinaAIProvider();
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

      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
      };

      const res = await fetch("https://r.jina.ai/", {
        method: "POST",
        body: JSON.stringify({
          pdf: base64String,
        }),
        headers,
      });

      if (!res.ok) {
        const error = await res.json();
        // we're checking for 429 , rate limit exceeded, and also checking if the error message contains "quota"
        if (res.status === 429 || (error?.detail && error.detail.includes("quota"))) {
          throw new Error(
            "Free tier limit exceeded. Please add an API key in Settings to process larger files.",
            { cause: { code: "FreeTierExceeded" } }
          );
        }
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
