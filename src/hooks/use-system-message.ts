import { useState, useEffect } from "react";

import { useSettings } from "./use-settings";

const defaultSystemMessage = `You are ChatCraft.org, a web-based, expert programming AI.
 You help programmers learn, experiment, and be more creative with code.
 Respond in GitHub flavored Markdown. Format ALL lines of code to 80
 characters or fewer. Use Mermaid diagrams when discussing visual topics.`;

const justShowMeTheCodeMessage =
  "However, when responding with code, ONLY return the code and NOTHING else (i.e., don't explain ANYTHING).";

function useSystemMessage() {
  const { settings } = useSettings();
  const [systemMessage, setSystemMessage] = useState(defaultSystemMessage);

  useEffect(() => {
    if (settings.justShowMeTheCode) {
      setSystemMessage(defaultSystemMessage + " " + justShowMeTheCodeMessage);
    } else {
      setSystemMessage(defaultSystemMessage);
    }
  }, [setSystemMessage, settings.justShowMeTheCode]);

  return systemMessage;
}

export default useSystemMessage;
