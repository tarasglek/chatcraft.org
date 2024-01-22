import { useState, useEffect } from "react";

const useAudioPlayer = () => {
  const [queue, setQueue] = useState<Promise<string>[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    if (!isPlaying && queue.length > 0) {
      playAudio(queue[0]);
    }
  }, [queue, isPlaying]);

  const playAudio = async (audioClipUri: Promise<string>) => {
    setIsPlaying(true);
    const audio = new Audio(await audioClipUri);
    audio.onended = () => {
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
