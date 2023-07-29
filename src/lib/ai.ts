import { ChatOpenAI } from "langchain/chat_models/openai";
import { CallbackManager } from "langchain/callbacks";

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

// Create the appropriate type of "OpenAI" compatible instance, based on `apiUrl`
const createChatAPI = ({
  temperature,
  streaming,
  model,
}: Pick<ChatOptions, "temperature" | "model"> & { streaming: boolean }) => {
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

  return new ChatOpenAI(
    {
      openAIApiKey: apiKey,
      temperature: temperature ?? 0,
      streaming,
      // Use the provided model, or fallback to whichever one is default right now
      modelName: model ? model.id : getSettings().model.id,
    },
    {
      basePath: apiUrl,
      baseOptions: {
        headers,
      },
    }
  );
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
  const streaming = !!onData;

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

  // Grab the promise so we can return, but callers can also do everything via events
  const chatAPI = createChatAPI({ temperature, streaming, model });
  const promise = chatAPI
    .call(
      /**
       * Convert the list of ChatCraftMessages to something langchain can use.
       * In most cases, this is straight-forward, but for function messages,
       * we need to separate the call and result into two parts
       */
      messages.map((message) => message.toLangChainMessage()),
      {
        options: { signal: controller.signal },
        /**
         * If the user provides functions to use, convert them to a form that
         * langchain can consume. However, since not all models support function calling,
         * don't bother if the model can't use them.
         */
        functions:
          model.supportsFunctionCalling && functions
            ? functions.map((fn) => fn.toLangChainFunction())
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
      },
      CallbackManager.fromHandlers({
        handleLLMNewToken(token: string) {
          buffer.push(token);
          if (onData && !isPaused) {
            onData({ token, currentText: buffer.join("") });
          }
        },
      })
    )
    .then(async ({ content, additional_kwargs }) => {
      if (additional_kwargs?.function_call) {
        const { name, arguments: args } = additional_kwargs.function_call;
        if (name && args) {
          return handleFunctionCallResponse(name, args);
        }
      }

      if (content) {
        return handleTextResponse(content);
      }

      throw new Error("unable to handle LLM response (not text or function)");
    })
    .catch((err) => {
      // Deal with cancelled messages by returning a partial message
      if (err.message.startsWith("Cancel:")) {
        buffer.push("...");
        const text = buffer.join("");

        const response = new ChatCraftAiMessage({ text, model: model || getSettings().model });
        if (onFinish) {
          onFinish(response);
        }

        return response;
      }

      const handleError = (error: Error) => {
        if (onError) {
          onError(error);
        }

        throw error;
      };

      // Try to extract the actual OpenAI API error from what langchain gives us
      // which is JSON embedded in the error text.
      // eslint-disable-next-line no-useless-catch
      try {
        const matches = err.message.match(/{"error".+$/);
        if (matches) {
          const openAiError = JSON.parse(matches[0]);
          handleError(new Error(`OpenAI API Error: ${openAiError.error.message}`));
        } else {
          handleError(err);
        }
      } catch (err2) {
        handleError(err2 as Error);
      }
    })
    .finally(() => {
      removeEventListener("keydown", handleCancel);
    });

  return {
    // HACK: for some reason, TS thinks this could also be undefined, but I don't see how.
    promise: promise as Promise<ChatCraftAiMessage | ChatCraftFunctionCallMessage>,
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
