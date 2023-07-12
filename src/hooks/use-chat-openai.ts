import { useState, useCallback, useEffect, useRef } from "react";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { CallbackManager } from "langchain/callbacks";
import { useKey } from "react-use";

import { useSettings } from "./use-settings";
import {
  ChatCraftMessage,
  ChatCraftAiMessage,
  ChatCraftSystemMessage,
} from "../lib/ChatCraftMessage";
import { createSystemMessage } from "../lib/system-prompt";
import { useCost } from "./use-cost";
import { calculateTokenCost, countTokensInMessages } from "../lib/ai";

function useChatOpenAI() {
  const [streamingMessage, setStreamingMessage] = useState<ChatCraftAiMessage>();
  const { settings } = useSettings();
  const [cancel, setCancel] = useState<() => void>(() => {});
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  const { incrementCost } = useCost();

  // Listen for escape being pressed on window, and cancel any in flight
  useKey("Escape", cancel, { event: "keydown" }, [cancel]);

  // Make sure we always use the correct `paused` value in our streaming callback below
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const pause = () => {
    setPaused(true);
  };

  const resume = () => {
    setPaused(false);
  };

  const togglePause = () => {
    setPaused(!paused);
  };

  // TODO: figure out how to combine the code in src/lib/ai.ts
  const callChatApi = useCallback(
    (messages: ChatCraftMessage[]) => {
      const buffer: string[] = [];
      const { model } = settings;
      const message = new ChatCraftAiMessage({ model, text: "" });
      // Cache the id so we can re-use it below
      const id = message.id;
      setStreamingMessage(message);

      const chatOpenAI = new ChatOpenAI({
        openAIApiKey: settings.apiKey,
        temperature: 0,
        streaming: true,
        modelName: settings.model.id,
      });

      // Allow the stream to be cancelled
      const controller = new AbortController();

      // Set the cancel and pause functions
      setCancel(() => () => {
        controller.abort();
      });

      // Send the chat's messages and prefix with a system message unless
      // the user has already included their own custom system message.
      const messagesToSend =
        messages[0] instanceof ChatCraftSystemMessage
          ? messages
          : [createSystemMessage(), ...messages];

      return chatOpenAI
        .call(
          messagesToSend,
          {
            options: { signal: controller.signal },
          },
          CallbackManager.fromHandlers({
            async handleLLMNewToken(token: string) {
              buffer.push(token);

              if (!pausedRef.current) {
                setStreamingMessage(
                  new ChatCraftAiMessage({
                    id,
                    model,
                    text: buffer.join(""),
                  })
                );
              }
            },
          })
        )
        .then(({ text }): Promise<[ChatCraftAiMessage, number]> => {
          const aiMessage = new ChatCraftAiMessage({
            id,
            model,
            text,
          });

          // If we're tracking token cost, update it
          if (settings.countTokens) {
            return Promise.all([aiMessage, countTokensInMessages([...messagesToSend, aiMessage])]);
          }

          return Promise.resolve([aiMessage, 0]);
        })
        .then(([aiMessage, tokens]) => {
          if (tokens) {
            const cost = calculateTokenCost(tokens, settings.model);
            incrementCost(cost);
          }

          return aiMessage;
        })
        .catch((err) => {
          // Deal with cancelled messages by returning a partial message
          if (err.message.startsWith("Cancel:")) {
            buffer.push("...");
            return new ChatCraftAiMessage({
              id,
              model,
              text: buffer.join(""),
            });
          }

          // Try to extract the actual OpenAI API error from what langchain gives us
          // which is JSON embedded in the error text.
          // eslint-disable-next-line no-useless-catch
          try {
            const matches = err.message.match(/{"error".+$/);
            if (matches) {
              const openAiError = JSON.parse(matches[0]);
              throw new Error(`OpenAI API Error: ${openAiError.error.message}`);
            }
            throw err;
          } catch (err2) {
            throw err2;
          }
        })
        .finally(() => {
          setStreamingMessage(undefined);
          setPaused(false);
        });
    },
    [settings, pausedRef, setStreamingMessage, incrementCost]
  );

  return {
    streamingMessage,
    callChatApi,
    cancel,
    paused,
    pause,
    resume,
    togglePause,
  };
}

export default useChatOpenAI;
