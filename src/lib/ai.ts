import { ChatOpenAI } from "langchain/chat_models/openai";
import { CallbackManager } from "langchain/callbacks";

import { ChatCraftMessage } from "./ChatCraftMessage";
import { ChatCraftModel } from "./ChatCraftModel";
import { Settings, getSettings, OPENAI_BASE_PATH } from "./settings";

import type { Tiktoken } from "tiktoken/lite";

function getBasePath(settings: Settings) {
  if (settings.basePath) {
    return settings.basePath;
  }
  return OPENAI_BASE_PATH;
}

function usingOfficialOpenAI(settings: Settings) {
  return getBasePath(settings).startsWith(OPENAI_BASE_PATH);
}

export type ChatOptions = {
  model?: ChatCraftModel;
  temperature?: number;
  onFinish?: (text: string) => void;
  onError?: (err: Error) => void;
  onPause?: () => void;
  onResume?: () => void;
  onData?: ({ token, currentText }: { token: string; currentText: string }) => void;
};

export const chatWithOpenAI = (messages: ChatCraftMessage[], options: ChatOptions = {}) => {
  // We can't do anything without an API key
  const settings = getSettings();
  const apiKey = settings.apiKey;
  if (!apiKey) {
    throw new Error("Missing OpenAI API Key");
  }

  const buffer: string[] = [];
  const { onData, onFinish, onPause, onResume, onError, temperature, model } = options;

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

  const currentUrlWithoutAnchor = window.location.origin + window.location.pathname;
  let headers = undefined;
  if (!usingOfficialOpenAI(settings)) {
    headers = {
      "HTTP-Referer": currentUrlWithoutAnchor,
      "X-Title": "chatcraft.org",
    };
  }
  const chatOpenAI = new ChatOpenAI(
    {
      openAIApiKey: apiKey,
      temperature: temperature ?? 0,
      // Only stream if the caller wants to handle onData events
      streaming: usingOfficialOpenAI(settings) && !!onData,
      // Use the provided model, or fallback to whichever one is default right now
      modelName: model ? model.id : getSettings().model.id,
    },
    {
      basePath: getBasePath(settings),
      baseOptions: {
        headers: headers,
      },
    }
  );

  // Grab the promise so we can return, but callers can also do everything via events
  const promise = chatOpenAI
    .call(
      messages,
      {
        options: { signal: controller.signal },
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
    .then(({ text }) => {
      if (onFinish) {
        onFinish(text);
      }
      return text;
    })
    .catch((err) => {
      // Deal with cancelled messages by returning a partial message
      if (err.message.startsWith("Cancel:")) {
        buffer.push("...");
        const text = buffer.join("");
        if (onFinish) {
          onFinish(text);
        }
        return text;
      }

      const handleError = (error: Error) => {
        if (onError) {
          onError(error);
        } else {
          throw error;
        }
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
    // Force the promise to always return a string (langchain's returns undefined in some cases)
    promise: promise.then((result) => (typeof result === "string" ? result : "")),
    cancel,
    pause,
    resume,
    togglePause,
  };
};

export async function queryOpenAiModels(apiKey: string) {
  const settings = getSettings();
  if (!usingOfficialOpenAI(settings)) {
    return [
      "google/palm-2-codechat-bison",
      "google/palm-2-chat-bison",
      "tiiuae/falcon-40b-instruct",
    ];
  }
  const res = await fetch(`${getBasePath(settings)}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error?.message ?? `error querying API`);
  }

  const { data } = await res.json();

  // Hide all pinned models (visual noise) except gpt-3.5-turbo-0613 as that wont be default till June 27 :(
  return data
    .filter(
      (model: any) =>
        model.id.includes("gpt") && (model.id == "gpt-3.5-turbo-0613" || !/\d{4}$/.test(model.id))
    )
    .map((model: any) => model.id) as string[];
}

export async function validateOpenAiApiKey(apiKey: string) {
  return !!(await queryOpenAiModels(apiKey));
}

// Cache this instance on first use
let encoding: Tiktoken;

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
