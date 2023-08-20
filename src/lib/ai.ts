import OpenAI from "openai";
import {
  ChatCraftAiMessage,
  ChatCraftFunctionCallMessage,
  ChatCraftMessage,
} from "./ChatCraftMessage";
import { ChatCraftModel } from "./ChatCraftModel";
import { ChatCraftFunction } from "./ChatCraftFunction";
import { getReferer } from "./utils";
import { getSettings, OPENAI_API_URL } from "./settings";

import type { Tiktoken } from "tiktoken/lite";

const usingOfficialOpenAI = () => getSettings().apiUrl === OPENAI_API_URL;

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

export const chatWithLLM = (messages: ChatCraftMessage[], options: ChatOptions = {}) => {
  const buffer: string[] = [];
  const {
    onData,
    onFinish,
    onPause,
    onResume,
    onError,
    temperature,
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

  // If we're using OpenRouter, add extra headers
  let headers = undefined;
  if (!usingOfficialOpenAI()) {
    headers = {
      "HTTP-Referer": getReferer(),
      "X-Title": "chatcraft.org",
    };
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: apiUrl,
    defaultHeaders: headers,
    dangerouslyAllowBrowser: true,
  });

  const chat_completion_params: OpenAI.Chat.CompletionCreateParams = {
    model: model ? model.id : getSettings().model.id,
    temperature: temperature ?? 0,

    /**
     * Convert the list of ChatCraftMessages to OpenAI messages.
     * In most cases, this is straight-forward, but for function messages,
     * we need to separate the call and result into two parts
     */
    messages: messages.map((message) => message.toOpenAiMessageJson()),
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

  const chat_completion_req_options = {
    signal: controller.signal,
  };

  let response_promise;
  if (streaming == true) {
    response_promise = openai.chat.completions
      .create(
        chat_completion_params as OpenAI.Chat.CompletionCreateParamsStreaming,
        chat_completion_req_options
      )
      .then(async (stream_response) => {
        let function_name: string = "";
        let function_args: string = "";
        for await (const stream_chunk of stream_response) {
          if (stream_chunk.choices[0]?.delta?.content) {
            const token = stream_chunk.choices[0]?.delta?.content;
            buffer.push(token);
            if (onData && !isPaused) {
              onData({ token, currentText: buffer.join("") });
            }
          }

          if (stream_chunk.choices[0]?.delta?.function_call) {
            if (stream_chunk.choices[0]?.delta?.function_call.name) {
              function_name = stream_chunk.choices[0]?.delta?.function_call.name;
            } else if (stream_chunk.choices[0]?.delta?.function_call.arguments) {
              const token = stream_chunk.choices[0]?.delta?.function_call.arguments;
              function_args += token;
              if (onData && !isPaused) {
                onData({ token, currentText: function_args });
              }
            } else {
              throw new Error("unable to handle OpenAI response (not function name or args)");
            }
          }
        }

        if (buffer.length > 0) {
          return handleTextResponse(buffer.join(""));
        }

        if (function_name && function_args) {
          return handleFunctionCallResponse(function_name, function_args);
        }

        throw new Error("unable to handle OpenAI response (not text or function)");
      })
      .catch((err) => {
        return handleError(err);
      })
      .finally(() => {
        removeEventListener("keydown", handleCancel);
      });
  } else {
    response_promise = openai.chat.completions
      .create(
        chat_completion_params as OpenAI.Chat.CompletionCreateParamsNonStreaming,
        chat_completion_req_options
      )
      .then(async (response: OpenAI.Chat.ChatCompletion) => {
        let function_name: string = "";
        let function_args: string = "";
        if (response.choices[0]?.message?.content) {
          buffer.push(response.choices[0]?.message?.content);
        }

        if (response.choices[0]?.message?.function_call) {
          if (response.choices[0]?.message?.function_call.name) {
            function_name = response.choices[0]?.message?.function_call.name;
          } else if (response.choices[0]?.message?.function_call.arguments) {
            function_args = response.choices[0]?.message?.function_call.arguments;
          } else {
            throw new Error("unable to handle OpenAI response (not function name or args)");
          }
        }

        if (buffer.length > 0) {
          return handleTextResponse(buffer.join(""));
        }

        if (function_name && function_args) {
          return handleFunctionCallResponse(function_name, function_args);
        }

        throw new Error("unable to handle OpenAI response (not text or function)");
      })
      .catch((err) => {
        return handleError(err);
      })
      .finally(() => {
        removeEventListener("keydown", handleCancel);
      });
  }

  return {
    // HACK: for some reason, TS thinks this could also be undefined, but I don't see how.
    promise: response_promise as Promise<ChatCraftAiMessage | ChatCraftFunctionCallMessage>,
    cancel,
    pause,
    resume,
    togglePause,
  };
};

export async function queryModels(apiKey: string) {
  const { apiUrl } = getSettings();
  const usingOpenAI = usingOfficialOpenAI();
  const res = await fetch(`${apiUrl}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error?.message ?? `error querying API`);
  }

  const { data } = await res.json();

  return data
    .filter((model: any) => !usingOpenAI || model.id.includes("gpt"))
    .map((model: any) => model.id) as string[];
}

export async function validateOpenAiApiKey(apiKey: string) {
  return !!(await queryModels(apiKey));
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
