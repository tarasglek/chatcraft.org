import { Box, Button, ButtonGroup, Flex } from "@chakra-ui/react";

import Message from "./Message";
import { ChatCraftAiMessage } from "../lib/ChatCraftMessage";

type NewMessageProps = {
  message: ChatCraftAiMessage;
  chatId: string;
  isPaused: boolean;
  onTogglePause: () => void;
  onCancel: () => void;
};

function NewMessage({ message, chatId, isPaused, onTogglePause, onCancel }: NewMessageProps) {
  // If the user presses the mouse button over the streaming message while
  // loading, pause to make it easier to copy/paste text as it streams in.
  function handleMouseDown() {
    if (!isPaused) {
      onTogglePause();
    }
  }

  return (
    <Flex flexDir="column" w="100%">
      <Box flex={1} onMouseDown={handleMouseDown}>
        <Message key={chatId} message={message} chatId={chatId} isLoading />
      </Box>
      <Box textAlign="center">
        <ButtonGroup>
          <Button variant="outline" size="xs" onClick={() => onCancel()}>
            Cancel
          </Button>

          {isPaused ? (
            <Button key="resume" size="xs" onClick={() => onTogglePause()}>
              Resume
            </Button>
          ) : (
            <Button key="pause" size="xs" onClick={() => onTogglePause()}>
              Pause
            </Button>
          )}
        </ButtonGroup>
      </Box>
    </Flex>
  );
}

export default NewMessage;
