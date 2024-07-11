import OpenAI from "openai";
import type { ChatCompletion, ChatCompletionChunk } from "openai/resources";
import { Stream } from "openai/streaming";
import type { Tiktoken } from "tiktoken/lite";
import { ChatCraftFunction } from "./ChatCraftFunction";
import {
  ChatCraftAiMessage,
  ChatCraftFunctionCallMessage,
  ChatCraftMessage,
} from "./ChatCraftMessage";
import { ChatCraftModel } from "./ChatCraftModel";
import { TextToSpeechVoices, getSettings } from "./settings";
import { APIPromise } from "openai/core";

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
  const { currentProvider } = getSettings();
  if (!currentProvider.apiKey) {
    throw new Error("Missing OpenAI API Key");
  }

  const { openai } = currentProvider.createClient(currentProvider.apiKey);
  const transcriptions = new OpenAI.Audio.Transcriptions(openai);
  const transcription = await transcriptions.create({
    file: audio,
    model: "whisper-1",
  });
  return transcription.text;
};

export function chatWithLLM(
  messages: ChatCraftMessage[],
  options: ChatOptions = {}
): {
  promise: Promise<ChatCraftAiMessage | ChatCraftFunctionCallMessage>;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  togglePause: () => void;
} {
  const settings = getSettings();
  const {
    onData,
    onFinish,
    onPause,
    onResume,
    onError,
    temperature = settings.temperature,
    model = settings.model,
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
  const pendingTokens: string[] = [];
  let functionName = "";
  let functionArgs = "";
  let uiRenderPromise: Promise<void> | null = null;

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
        pendingTokens.push(token);

        // We need to render this new content, so we'll schedule a UI render
        // when the main thread is ready before before proceeding so we don't
        // swamp it with too many concurrent updates.
        if (!uiRenderPromise) {
          uiRenderPromise = new Promise((resolve) => {
            requestAnimationFrame(() => {
              onData({ token: pendingTokens.join(""), currentText: buffer.join("") });
              pendingTokens.length = 0;
              uiRenderPromise = null;
              resolve();
            });
          });
        }
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

  if (!settings.currentProvider.apiKey) {
    throw new Error("Missing API Key");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { openai, headers } = settings.currentProvider.createClient(
    settings.currentProvider.apiKey
  );

  const chatCompletionParams: OpenAI.Chat.ChatCompletionCreateParams = {
    model: model ? model.id : settings.model.id,
    temperature: Math.min(Math.max(temperature ?? 0, 0.0), 2.0),

    /**
     * Convert the list of ChatCraftMessages to OpenAI messages.
     * In most cases, this is straight-forward, but for function messages,
     * we need to separate the call and result into two parts
     */
    messages: messages.map((message) => message.toOpenAiMessage()),
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

    if (uiRenderPromise) {
      await uiRenderPromise;
    }
    const content = buffer.join("");
    return handleOpenAIResponse(content, functionName, functionArgs);
  };

  const handleNonStreamingResponse = async (response: any) => {
    const { content, functionName, functionArgs } = parseOpenAIResponse(response);
    return handleOpenAIResponse(content, functionName, functionArgs);
  };

  const handleResponse = streaming ? handleStreamingResponse : handleNonStreamingResponse;
  const createChatCompletion = createWindowAIChatCompletionIterator as any; //openai.chat.completions.create;
  const responsePromise = createChatCompletion(
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
}

type Message = {
  role: string;
  content: string;
};

function openaiToBrowserAI(messages: Message[]): string {
  const formattedMessages = messages.map((message, index) => {
    let formattedMessage = "";

    const content = message.content.trim();
    if (message.role === "system") {
      formattedMessage = content;
    } else if (message.role === "user") {
      formattedMessage = `User:\n${content}`;
    } else if (message.role === "assistant") {
      formattedMessage = `Model:\n${content}`;
    }

    // Add separator after system messages and Model: replies
    if (
      message.role === "system" ||
      (message.role === "assistant" && index < messages.length - 1)
    ) {
      formattedMessage += "<ctrl23>";
    }

    return formattedMessage;
  });

  // Ensure the string ends with "Model:"
  if (!formattedMessages[formattedMessages.length - 1].startsWith("Model:")) {
    formattedMessages.push("Model:\n");
  }

  return formattedMessages.join("\n");
}

async function* createWindowAIChatCompletion(
  body: OpenAI.Chat.ChatCompletionCreateParamsStreaming
): AsyncIterableIterator<ChatCompletionChunk> {
  const aiConvo = openaiToBrowserAI(body.messages as any);
  const session = await (window as any).ai.createTextSession();
  const stream = session.promptStreaming(aiConvo);
  let previous = "";

  try {
    for await (const chunk of stream) {
      const incremental = chunk.slice(previous.length);
      previous = chunk;
      yield {
        choices: [{ index: 0, finish_reason: null, delta: { content: incremental } }],
        id: "",
        created: 0,
        model: "",
        object: "chat.completion.chunk",
      };
    }
  } finally {
    await session.destroy();
  }
}

function createWindowAIChatCompletionIterator(
  body: OpenAI.Chat.ChatCompletionCreateParamsStreaming,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ignore: any
): APIPromise<Promise<AsyncIterableIterator<ChatCompletionChunk>>> {
  return new Promise((resolve) => {
    resolve(createWindowAIChatCompletion(body));
  }) as any;
}

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

/**
 * Only meant to be used outside components or hooks
 * where useModels cannot be used.
 */
export async function isTtsSupported() {
  const { currentProvider } = getSettings();
  if (!currentProvider.apiKey) {
    throw new Error("Missing API Key");
  }

  return (
    (await currentProvider.queryModels(currentProvider.apiKey)).filter((model: string) =>
      model.includes("tts")
    )?.length > 0
  );
}

type TextToSpeechModel = "tts-1" | "tts-1-hd";

/**
 *
 * @param message The text for which speech needs to be generated
 * @returns A Promise that resolves to the URL of generated audio clip
 */
export const textToSpeech = async (
  message: string,
  voice: TextToSpeechVoices = TextToSpeechVoices.ALLOY,
  model: TextToSpeechModel = "tts-1"
): Promise<string> => {
  const { currentProvider } = getSettings();
  if (!currentProvider.apiKey) {
    throw new Error("Missing API Key");
  }
  const { openai } = currentProvider.createClient(currentProvider.apiKey);

  const response = await openai.audio.speech.create({
    model,
    voice,
    input: message,
  });

  const audioUrl = URL.createObjectURL(await response.blob());

  return audioUrl;
};

/**
 * Only meant to be used outside components or hooks
 * where useModels cannot be used.
 */
export async function isGenerateImageSupported() {
  const { currentProvider } = getSettings();
  if (!currentProvider.apiKey) {
    throw new Error("Missing API Key");
  }

  return (
    (await currentProvider.queryModels(currentProvider.apiKey)).filter((model: string) =>
      model.includes("dall-e-3")
    )?.length > 0
  );
}

export type Dalle3ImageSize = "1024x1024" | "1792x1024" | "1024x1792";

type GenerateImageParams = {
  prompt: string;
  n?: number;
  size?: Dalle3ImageSize;
};

export const generateImage = async ({
  prompt,
  //You can request 1 image at a time with DALL·E 3 (request more by making parallel requests) or up to 10 images at a time using DALL·E 2 with the n parameter.
  //https://platform.openai.com/docs/guides/images/generations
  n = 1,
  size = "1024x1024",
}: GenerateImageParams): Promise<string[]> => {
  const { currentProvider } = getSettings();
  if (!currentProvider.apiKey) {
    throw new Error("Missing OpenAI API Key");
  }

  const { openai } = currentProvider.createClient(currentProvider.apiKey);

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n,
      size,
      response_format: "b64_json",
    });

    const imageUrls = response.data.map(({ b64_json }) => `data:image/jpeg;base64,${b64_json}`);
    return imageUrls;
  } catch (error: any) {
    throw new Error(error);
  }
};
