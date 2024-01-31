import { useState, useEffect } from "react";

const useAudioPlayer = () => {
  // We are managing promises of audio urls instead of directly storing strings
  // because there is no guarantee when openai tts api finishes processing and resolves a specific url
  // For more info, check this comment:
  // https://github.com/tarasglek/chatcraft.org/pull/357#discussion_r1473470003
  const [queue, setQueue] = useState<Promise<string>[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    if (!isPlaying && queue.length > 0) {
      playAudio(queue[0]);
    }
  }, [queue, isPlaying]);

  const playAudio = async (audioClipUri: Promise<string>) => {
    setIsPlaying(true);
    const audioUrl: string = await audioClipUri;
    const audio = new Audio(audioUrl);
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      setQueue((oldQueue) => oldQueue.slice(1));
      setIsPlaying(false);
    };
    audio.play();
  };

  const addToAudioQueue = (audioClipUri: Promise<string>) => {
    setQueue((oldQueue) => [...oldQueue, audioClipUri]);
  };

  return { addToAudioQueue };
};

export default useAudioPlayer;
