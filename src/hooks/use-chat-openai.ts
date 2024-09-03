import { useCallback, useEffect, useRef, useState } from "react";

import nlp from "compromise";
import { ChatCraftFunction } from "../lib/ChatCraftFunction";
import {
  ChatCraftAiMessage,
  ChatCraftFunctionCallMessage,
  ChatCraftMessage,
} from "../lib/ChatCraftMessage";
import { ChatCraftModel } from "../lib/ChatCraftModel";
import {
  calculateTokenCost,
  chatWithLLM,
  countTokensInMessages,
  isTtsSupported,
  textToSpeech,
} from "../lib/ai";
import { tokenize } from "../lib/summarize";
import useAudioPlayer from "./use-audio-player";
import { useAutoScroll } from "./use-autoscroll";
import { useCost } from "./use-cost";
import { useSettings } from "./use-settings";
import { useAlert } from "./use-alert";

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

  const { addToAudioQueue, audioQueueDisabledRef, enableAudioQueue } = useAudioPlayer();
  const { error } = useAlert();

  const callChatApi = useCallback(
    async (
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

      const ttsSupported = await isTtsSupported();
      // Set a maximum words in a sentence that we need to wait for.
      // This reduces latency and number of TTS api calls
      const TTS_BUFFER_THRESHOLD = 25;

      // To calculate the current position in the AI generated text stream
      let ttsCursor = 0;
      let ttsWordsBuffer = "";

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
        onData({ currentText }) {
          if (!pausedRef.current) {
            //#region Text to Speech

            try {
              ttsWordsBuffer = currentText.slice(ttsCursor);

              const { sentences } = tokenize(ttsWordsBuffer);

              if (
                ttsSupported &&
                settings.textToSpeech.announceMessages &&
                !audioQueueDisabledRef?.current
              ) {
                if (
                  sentences.length > 1 // Has one full sentence
                ) {
                  // Pass the sentence to tts api for processing
                  const textToBeProcessed = sentences[0];
                  const audioClipUri = textToSpeech(textToBeProcessed, settings.textToSpeech.voice);
                  addToAudioQueue(audioClipUri);

                  // Update the tts Cursor
                  ttsCursor += textToBeProcessed.length;
                } else if (
                  nlp(ttsWordsBuffer).terms().out("array").length >= TTS_BUFFER_THRESHOLD
                ) {
                  // Try to break the large sentence into clauses
                  const clauseToProcess = nlp(ttsWordsBuffer).clauses().out("array")[0];
                  const audioClipUri = textToSpeech(clauseToProcess, settings.textToSpeech.voice);
                  addToAudioQueue(audioClipUri);

                  ttsCursor += clauseToProcess.length;
                }
              }
            } catch (err: any) {
              console.error(err);
              error({ title: "Error generating audio", message: err.message });
            }

            //#endregion

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
            ttsSupported &&
            settings.textToSpeech.announceMessages &&
            !audioQueueDisabledRef?.current &&
            ttsWordsBuffer.length
          ) {
            try {
              // Call TTS for any remaining words
              const audioClipUri = textToSpeech(ttsWordsBuffer, settings.textToSpeech.voice);
              addToAudioQueue(audioClipUri);
            } catch (err: any) {
              console.error(err);
              error({ title: "Error generating audio", message: err.message });
            }
          }

          // In case TTS was temporarily disabled, just for this message
          enableAudioQueue();
        });
    },
    [
      settings.model,
      settings.textToSpeech.announceMessages,
      settings.textToSpeech.voice,
      settings.countTokens,
      setShouldAutoScroll,
      resetScrollProgress,
      incrementScrollProgress,
      addToAudioQueue,
      error,
      incrementCost,
      audioQueueDisabledRef,
      enableAudioQueue,
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
