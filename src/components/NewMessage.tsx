import { AIChatMessage } from "langchain/schema";
import { Box, Button, ButtonGroup, Flex } from "@chakra-ui/react";

import Message from "./Message";

type NewMessageProps = {
  message: AIChatMessage;
  isPaused: boolean;
  onTogglePause: () => void;
  onCancel: () => void;
};

function NewMessage({ message, isPaused, onTogglePause, onCancel }: NewMessageProps) {
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
        <Message message={message} loading={true} />
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
