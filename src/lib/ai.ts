import OpenAI from "openai";
import {
  ChatCraftAiMessage,
  ChatCraftFunctionCallMessage,
  ChatCraftMessage,
} from "./ChatCraftMessage";
import { ChatCraftModel } from "./ChatCraftModel";
import { ChatCraftFunction } from "./ChatCraftFunction";
import { getReferer } from "./utils";
import { getSettings, OPENAI_API_URL, OPENROUTER_API_URL } from "./settings";
import { Stream } from "openai/streaming";

import type { Tiktoken } from "tiktoken/lite";
import type { ChatCompletionChunk } from "openai/resources";

export const usingOfficialOpenAI = () => getSettings().apiUrl === OPENAI_API_URL;
export const usingOfficialOpenRouter = () => getSettings().apiUrl === OPENROUTER_API_URL;

const createClient = (apiKey: string, apiUrl?: string) => {
  // If we're using OpenRouter, add extra headers
  let headers = undefined;
  if (!usingOfficialOpenAI()) {
    headers = {
      "HTTP-Referer": getReferer(),
      "X-Title": "chatcraft.org",
    };
  }

  return {
    openai: new OpenAI({
      apiKey: apiKey,
      baseURL: apiUrl,
      defaultHeaders: headers,
      dangerouslyAllowBrowser: true,
    }),
    headers,
  };
};

// Each provider does their model naming differently, pick the right one
export const defaultModelForProvider = () => {
  // OpenAI
  if (usingOfficialOpenAI()) {
    return new ChatCraftModel("gpt-3.5-turbo");
  }

  // OpenRouter.ai
  return new ChatCraftModel("openai/gpt-3.5-turbo");
};

export type ChatOptions = {
  model?: ChatCraftModel;
  functions?: ChatCraftFunction[];
  functionToCall?: ChatCraftFunction;
  respondWithText?: boolean;
  temperature?: number;
  onFinish?: (message: ChatCraftAiMessage | ChatCraftFunctionCallMessage) => void;
  onError?: (err: Error) => void;
  onPause?: () => void;
  onResume?: () => void;
  onData?: ({ token, currentText }: { token: string; currentText: string }) => void;
};

function parseOpenAIChunkResponse(chunk: OpenAI.Chat.ChatCompletionChunk) {
  let functionName: string = "";
  let functionArgs: string = "";
  let token: string = "";

  const chunkDelta = chunk.choices[0]?.delta;
  if (chunkDelta?.content) {
    token = chunkDelta?.content;
  }

  const chunkDeltaFunctionCall = chunkDelta?.function_call;
  if (chunkDeltaFunctionCall) {
    if (chunkDeltaFunctionCall.name) {
      functionName = chunkDeltaFunctionCall.name;
    } else if (chunkDeltaFunctionCall.arguments) {
      const token = chunkDeltaFunctionCall.arguments;
      functionArgs = functionArgs + token;
    } else {
      throw new Error("unable to handle OpenAI response (not function name or args)");
    }
  }

  return { token, functionName, functionArgs };
}

function parseOpenAIResponse(response: OpenAI.Chat.ChatCompletion) {
  let functionName: string = "";
  let functionArgs: string = "";
  let content: string = "";

  const responseMsg = response.choices[0]?.message;
  if (responseMsg?.content) {
    content = responseMsg?.content;
  }

  const responseFunctionCall = response.choices[0]?.message.function_call;
  if (responseFunctionCall) {
    if (responseFunctionCall.name) {
      functionName = responseFunctionCall.name;
    } else if (responseFunctionCall.arguments) {
      functionArgs = responseFunctionCall.arguments;
    } else {
      throw new Error("unable to handle OpenAI response (not function name or args)");
    }
  }

  return { content, functionName, functionArgs };
}

export const transcribe = async (audio: File) => {
  const { apiKey, apiUrl } = getSettings();
  if (!apiKey) {
    throw new Error("Missing OpenAI API Key");
  }

  const { openai } = createClient(apiKey, apiUrl);
  const transcriptions = new OpenAI.Audio.Transcriptions(openai);
  const transcription = await transcriptions.create({
    file: audio,
    model: "whisper-1",
  });
  return transcription.text;
};

export const chatWithLLM = (messages: ChatCraftMessage[], options: ChatOptions = {}) => {
  const {
    onData,
    onFinish,
    onPause,
    onResume,
    onError,
    temperature = getSettings().temperature,
    model = getSettings().model,
    functions,
    functionToCall,
  } = options;

  // Allow the stream to be cancelled
  const controller = new AbortController();

  // Wire-up ESC key to cancel
  const cancel = () => {
    controller.abort();
  };
  const handleCancel = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      cancel();
    }
  };
  addEventListener("keydown", handleCancel);

  // Allow pause and resume
  let isPaused = false;
  const pause = () => {
    isPaused = true;
    if (onPause) {
      onPause();
    }
  };
  const resume = () => {
    isPaused = false;
    if (onResume) {
      onResume();
    }
  };
  const togglePause = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  // Only stream if we have an onData callback
  const streaming: boolean = !!onData;

  // Regular text response from LLM
  const handleTextResponse = async (text: string = "") => {
    const response = new ChatCraftAiMessage({ text, model });

    if (onFinish) {
      onFinish(response);
    }
    return response;
  };

  // Function invocation request from LLM
  const handleFunctionCallResponse = async (functionName: string, functionArgs: string) => {
    const func = functions?.find(({ name }) => name === functionName);
    if (!func) {
      throw new Error(`no function found matching ${functionName}`);
    }

    const data = JSON.parse(functionArgs);
    const text = `**Function Call**: [${func.prettyName}](${func.url})\n
\`\`\`js
/* ${func.description} */
${func.name}(${JSON.stringify(data, null, 2)})\n\`\`\`\n`;

    return new ChatCraftFunctionCallMessage({
      text,
      model,
      func: {
        id: func.id,
        name: func.name,
        params: data,
      },
    });
  };

  const handleOpenAIResponse = async (
    content: string,
    functionName: string,
    functionArgs: string
  ) => {
    if (content.length > 0) {
      return handleTextResponse(content);
    }

    if (functionName && functionArgs) {
      return handleFunctionCallResponse(functionName, functionArgs);
    }

    throw new Error("unable to handle OpenAI response (not text or function)");
  };

  const buffer: string[] = [];
  let functionName: string = "";
  let functionArgs: string = "";
  const streamOpenAIResponse = async (token: string, func: string, args: string) => {
    if (func || args) {
      functionName += func;
      functionArgs += args;
      if (onData && !isPaused) {
        onData({ token: func, currentText: functionArgs });
      }
    } else if (token) {
      buffer.push(token);
      if (onData && !isPaused) {
        onData({ token, currentText: buffer.join("") });
      }
    }

    return { token, functionName, functionArgs };
  };

  const handleError = async (error: Error) => {
    if (onError) {
      onError(error);
    }

    throw new Error(`OpenAI API Returned Error: ${error.message}`);
  };

  const { apiKey, apiUrl } = getSettings();
  if (!apiKey) {
    throw new Error("Missing API Key");
  }
  const { openai, headers } = createClient(apiKey, apiUrl);

  const chatCompletionParams: OpenAI.Chat.ChatCompletionCreateParams = {
    model: model ? model.id : getSettings().model.id,
    temperature: Math.min(Math.max(temperature ?? 0, 0.0), 2.0),

    /**
     * Convert the list of ChatCraftMessages to OpenAI messages.
     * In most cases, this is straight-forward, but for function messages,
     * we need to separate the call and result into two parts
     */
    messages: messages.map((message) => message.toOpenAiMessage(model)),
    stream: streaming,

    /**
     * If the user provides functions to use, convert them to a form that
     * OpenAI can consume. However, since not all models support function calling,
     * don't bother if the model can't use them.
     */
    functions:
      model.supportsFunctionCalling && functions
        ? functions.map((fn) => fn.toOpenAIFunction())
        : undefined,

    /**
     * If function(s) are provided, see if the caller wants a particular
     * function to be called by name.  If not, let the LLM decide ("auto").
     */
    function_call:
      model.supportsFunctionCalling && functions
        ? functionToCall?.name
          ? { name: functionToCall.name }
          : "auto"
        : undefined,

    /*
     Got this value from error message of OpenAI's gpt-4-vision-preview max_tokens
     by setting a very large number,
     After setting this value, seems no cutoff
     Tested on version openai@4.24.7, without max_tokens response still cutoff
     */
    max_tokens: model.supportsImages ? 4096 : undefined,
  };

  const chatCompletionReqOptions = {
    headers: headers,
    signal: controller.signal,
  };

  const handleStreamingResponse = async (streamResponse: Stream<ChatCompletionChunk>) => {
    for await (const streamChunk of streamResponse) {
      const parsedData = parseOpenAIChunkResponse(streamChunk);
      await streamOpenAIResponse(
        parsedData.token,
        parsedData.functionName,
        parsedData.functionArgs
      );
    }

    const content = buffer.join("");
    return handleOpenAIResponse(content, functionName, functionArgs);
  };

  const handleNonStreamingResponse = async (response: any) => {
    const { content, functionName, functionArgs } = parseOpenAIResponse(response);
    return handleOpenAIResponse(content, functionName, functionArgs);
  };

  const handleResponse = streaming ? handleStreamingResponse : handleNonStreamingResponse;

  const responsePromise = openai.chat.completions
    .create(
      chatCompletionParams as OpenAI.Chat.ChatCompletionCreateParamsStreaming,
      chatCompletionReqOptions
    )
    .then(handleResponse)
    .catch(handleError)
    .finally(() => {
      removeEventListener("keydown", handleCancel);
    });

  return {
    promise: responsePromise,
    cancel,
    pause,
    resume,
    togglePause,
  };
};

export async function queryModels(apiKey: string) {
  const { apiUrl } = getSettings();
  const { openai } = createClient(apiKey, apiUrl);

  try {
    const models = [];
    for await (const page of openai.models.list()) {
      models.push(page);
    }

    return models.map((model: any) => model.id) as string[];
  } catch (err: any) {
    throw new Error(err.message ?? `error querying models API`);
  }
}

export async function validateOpenAiApiKey(apiKey: string) {
  return !!(await queryModels(apiKey));
}

export async function validateOpenRouterApiKey(apiKey: string) {
  // Use response from https://openrouter.ai/docs#limits to check if API key is valid
  const res = await fetch(`https://openrouter.ai/api/v1/auth/key`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${await res.text()}`);
  }

  return true;
}

export async function validateApiKey(apiKey: string) {
  if (usingOfficialOpenAI()) {
    return validateOpenAiApiKey(apiKey);
  }

  if (usingOfficialOpenRouter()) {
    return validateOpenRouterApiKey(apiKey);
  }

  // If not either of those providers, something is wrong
  throw new Error("unexpected provider, not able to validate api key");
}

// Cache this instance on first use
let encoding: Tiktoken;

// TODO: If we're using OpenRouter, we have to alter our token counting logic for other models...
export const countTokens = async (text: string) => {
  if (!encoding) {
    // Warn if this happens when it shouldn't. The UI should only
    // be calling `countTokens()` if we have the setting enabled
    if (!getSettings().countTokens) {
      console.trace("Unexpected call to countTokens() when settings.countTokens not set");
    }

    // We don't bundle these, but load them dynamically at runtime if needed due to size
    const { Tiktoken } = await import("tiktoken/lite");
    const cl100k_base = await import("tiktoken/encoders/cl100k_base.json");
    encoding = new Tiktoken(cl100k_base.bpe_ranks, cl100k_base.special_tokens, cl100k_base.pat_str);
  }

  return encoding.encode(text).length;
};

export const countTokensInMessages = async (messages: ChatCraftMessage[]) => {
  const counts = await Promise.all<number>(messages.map((message) => message.tokens()));
  return counts.reduce((total, current) => total + current, 0);
};

// See https://openai.com/pricing
export const calculateTokenCost = (tokens: number, model: ChatCraftModel) => {
  // Pricing is per 1,000 tokens
  tokens = tokens / 1000;

  if (model.id.startsWith("gpt-4")) {
    return tokens * 0.06;
  }

  if (model.id.startsWith("gpt-3.5")) {
    return tokens * 0.002;
  }

  console.warn(`Unknown pricing for model ${model.toString()}`);
  return 0;
};

export const openRouterPkceRedirect = () => {
  const callbackUrl = location.origin;
  // Redirect the user to the OpenRouter authentication page in the same tab
  location.href = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callbackUrl)}`;
};

/**
 * Only meant to be used outside components or hooks
 * where useModels cannot be used.
 */
export async function isTtsSupported() {
  const { apiKey } = getSettings();
  if (!apiKey) {
    throw new Error("Missing API Key");
  }

  return (await queryModels(apiKey)).filter((model: string) => model.includes("tts"))?.length > 0;
}

/**
 *
 * @param message The text for which speech needs to be generated
 * @returns A Promise that resolves to the URL of generated audio clip
 */
export const textToSpeech = async (message: string): Promise<string> => {
  const { apiKey, apiUrl } = getSettings();
  if (!apiKey) {
    throw new Error("Missing API Key");
  }
  const { openai } = createClient(apiKey, apiUrl);

  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "onyx",
    input: message,
  });

  const blob = new Blob([await mp3.arrayBuffer()], { type: "audio/mp3" });
  const objectUrl = URL.createObjectURL(blob);

  return objectUrl;
};
