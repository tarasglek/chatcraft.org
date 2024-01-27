import { useState, useCallback, useEffect, useRef } from "react";

import { useSettings } from "./use-settings";
import {
  ChatCraftMessage,
  ChatCraftAiMessage,
  ChatCraftFunctionCallMessage,
} from "../lib/ChatCraftMessage";
import { useCost } from "./use-cost";
import {
  calculateTokenCost,
  chatWithLLM,
  countTokensInMessages,
  isTtsSupported,
  textToSpeech,
} from "../lib/ai";
import { ChatCraftModel } from "../lib/ChatCraftModel";
import { ChatCraftFunction } from "../lib/ChatCraftFunction";
import { useAutoScroll } from "./use-autoscroll";
import useAudioPlayer from "./use-audio-player";
import { getSettings } from "../lib/settings";

const noop = () => {};

function useChatOpenAI() {
  const { settings } = useSettings();
  const { incrementCost } = useCost();
  const { incrementScrollProgress, resetScrollProgress, setShouldAutoScroll } = useAutoScroll();
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

  const { addToAudioQueue } = useAudioPlayer();

  const callChatApi = useCallback(
    (
      messages: ChatCraftMessage[],
      {
        model = settings.model,
        functions,
        functionToCall,
      }: {
        model?: ChatCraftModel;
        functions?: ChatCraftFunction[];
        functionToCall?: ChatCraftFunction;
      } = {}
    ) => {
      // When we're streaming, use this message to hold the content as it comes.
      // Later we'll replace it with the full response.
      const message = new ChatCraftAiMessage({ model, text: "" });
      setStreamingMessage(message);
      setShouldAutoScroll(true);
      resetScrollProgress();

      // Set a maximum words in a sentence that we need to wait for.
      // This reduces latency and number of TTS api calls
      const TTS_BUFFER_THRESHOLD = 25;

      // To calculate the current position in the AI generated text stream
      let ttsCursor = 0;
      let ttsWordsBuffer = "";
      const sentenceEndRegex = new RegExp(/[.!?]+/g);

      const chat = chatWithLLM(messages, {
        model,
        functions,
        functionToCall,
        onPause() {
          setPaused(true);
        },
        onResume() {
          setPaused(false);
        },
        async onData({ currentText }) {
          if (!pausedRef.current) {
            // Hook tts code here
            ttsWordsBuffer = currentText.slice(ttsCursor);

            if (
              isTtsSupported() &&
              getSettings().announceMessages &&
              sentenceEndRegex.test(ttsWordsBuffer) // Has full sentence
            ) {
              // Reset lastIndex before calling exec
              sentenceEndRegex.lastIndex = 0;
              const sentenceEndIndex = sentenceEndRegex.exec(ttsWordsBuffer)!.index;

              // Pass the sentence to tts api for processing
              const textToBeProcessed = ttsWordsBuffer.slice(0, sentenceEndIndex + 1);
              const audioClipUri = textToSpeech(textToBeProcessed);
              addToAudioQueue(audioClipUri);

              // Update the tts Cursor
              ttsCursor += sentenceEndIndex + 1;
            } else if (ttsWordsBuffer.split(" ").length >= TTS_BUFFER_THRESHOLD) {
              // Flush the entire buffer into tts api
              const audioClipUri = textToSpeech(ttsWordsBuffer);
              addToAudioQueue(audioClipUri);

              ttsCursor += ttsWordsBuffer.length;
            }

            setStreamingMessage(
              new ChatCraftAiMessage({
                id: message.id,
                date: message.date,
                model: message.model,
                text: currentText,
              })
            );
            incrementScrollProgress();
          }
        },
      });

      pauseRef.current = chat.pause;
      resumeRef.current = chat.resume;
      toggleRef.current = chat.togglePause;
      cancelRef.current = chat.cancel;

      return chat.promise
        .then((response): Promise<[ChatCraftAiMessage | ChatCraftFunctionCallMessage, number]> => {
          // Re-use the id and date from the message we've been streaming for consistency in UI
          response.id = message.id;
          response.date = message.date;

          // If we're tracking token cost, update it
          // TODO: this is wrong with functions now involved
          if (settings.countTokens) {
            return Promise.all([response, countTokensInMessages([...messages, response])]);
          }

          return Promise.resolve([response, 0]);
        })
        .then(([response, tokens]) => {
          if (tokens) {
            const cost = calculateTokenCost(tokens, settings.model);
            incrementCost(cost);
          }

          return response;
        })
        .finally(() => {
          setStreamingMessage(undefined);
          setPaused(false);
          resetScrollProgress();
          setShouldAutoScroll(false);

          if (
            isTtsSupported() &&
            getSettings().announceMessages &&
            ttsWordsBuffer.slice(ttsCursor).length
          ) {
            // Call TTS for any remaining words
            const audioClipUri = textToSpeech(ttsWordsBuffer);
            addToAudioQueue(audioClipUri);
          }
        });
    },
    [
      settings,
      pausedRef,
      setShouldAutoScroll,
      resetScrollProgress,
      incrementScrollProgress,
      setStreamingMessage,
      incrementCost,
      addToAudioQueue,
    ]
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
