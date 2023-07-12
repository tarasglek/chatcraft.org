import { useState, useCallback, useEffect, useRef } from "react";

import { useSettings } from "./use-settings";
import { ChatCraftMessage, ChatCraftAiMessage } from "../lib/ChatCraftMessage";
import { useCost } from "./use-cost";
import { calculateTokenCost, chatWithLLM, countTokensInMessages } from "../lib/ai";
import { ChatCraftModel } from "../lib/ChatCraftModel";

const noop = () => {};

function useChatOpenAI() {
  const { settings } = useSettings();
  const { incrementCost } = useCost();

  const [streamingMessage, setStreamingMessage] = useState<ChatCraftAiMessage>();

  const pauseRef = useRef<() => void>();
  const resumeRef = useRef<() => void>();
  const toggleRef = useRef<() => void>();
  const cancelRef = useRef<() => void>();

  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);

  // Make sure we always use the correct `paused` value in our streaming callback below
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const callChatApi = useCallback(
    (messages: ChatCraftMessage[], model?: ChatCraftModel) => {
      const aiMessage = new ChatCraftAiMessage({ model: model ?? settings.model, text: "" });
      setStreamingMessage(aiMessage);

      const chat = chatWithLLM(messages, {
        model,
        onPause() {
          setPaused(true);
        },
        onResume() {
          setPaused(false);
        },
        onData({ currentText }) {
          if (!pausedRef.current) {
            setStreamingMessage(
              new ChatCraftAiMessage({
                id: aiMessage.id,
                date: aiMessage.date,
                model: aiMessage.model,
                text: currentText,
              })
            );
          }
        },
      });

      pauseRef.current = chat.pause;
      resumeRef.current = chat.resume;
      toggleRef.current = chat.togglePause;
      cancelRef.current = chat.cancel;

      return chat.promise
        .then((text): Promise<[ChatCraftAiMessage, number]> => {
          const response = new ChatCraftAiMessage({
            id: aiMessage.id,
            date: aiMessage.date,
            model: aiMessage.model,
            text,
          });

          // If we're tracking token cost, update it
          if (settings.countTokens) {
            return Promise.all([response, countTokensInMessages([...messages, aiMessage])]);
          }

          return Promise.resolve([response, 0]);
        })
        .then(([aiMessage, tokens]) => {
          if (tokens) {
            const cost = calculateTokenCost(tokens, settings.model);
            incrementCost(cost);
          }

          return aiMessage;
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
    paused,
    // HACK: Because there's a chance these function refs might not exist yet, always
    // pass an actual function so we don't have to deal with `undefined` in callers.
    // In practice, this won't be in issue, but the TypeScript-tax must be paid.
    pause: pauseRef.current ?? noop,
    resume: resumeRef.current ?? noop,
    togglePause: toggleRef.current ?? noop,
    cancel: cancelRef.current ?? noop,
  };
}

export default useChatOpenAI;
