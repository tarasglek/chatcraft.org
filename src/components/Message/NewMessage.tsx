import { Box, Button, ButtonGroup, IconButton } from "@chakra-ui/react";
import { CgClose } from "react-icons/cg";
import { TbPlayerPlay, TbPlayerPause } from "react-icons/tb";

import { ChatCraftAiMessage } from "../../lib/ChatCraftMessage";
import AiMessage from "./AiMessage";
import { useAutoScroll } from "../../hooks/use-autoscroll";
import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";

type NewMessageProps = {
  message: ChatCraftAiMessage;
  chatId: string;
  isPaused: boolean;
  onTogglePause: () => void;
  onCancel: () => void;
};

type ControlButtonsProps = Omit<NewMessageProps, "message" | "chatId">;

function MobileButtons({ isPaused, onTogglePause, onCancel }: ControlButtonsProps) {
  return (
    <ButtonGroup>
      <IconButton
        variant="outline"
        size="lg"
        isRound
        aria-label="Cancel"
        onClick={() => onCancel()}
        icon={<CgClose />}
      />

      {isPaused ? (
        <IconButton
          key="resume"
          size="lg"
          isRound
          aria-label="Resume"
          onClick={() => onTogglePause()}
          icon={<TbPlayerPlay />}
        />
      ) : (
        <IconButton
          key="pause"
          size="lg"
          isRound
          aria-label="Pause"
          onClick={() => onTogglePause()}
          icon={<TbPlayerPause />}
        />
      )}
    </ButtonGroup>
  );
}

function DesktopButtons({ isPaused, onTogglePause, onCancel }: ControlButtonsProps) {
  return (
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
  );
}

function NewMessage({ message, chatId, isPaused, onTogglePause, onCancel }: NewMessageProps) {
  const { scrollBottomRef } = useAutoScroll();
  const isMobile = useMobileBreakpoint();

  return (
    <>
      <AiMessage
        key={message.id}
        message={message}
        chatId={chatId}
        editing={false}
        onEditingChange={/* ignore editing changes while streaming new response */ () => {}}
        isLoading
        heading={message.model.prettyModel}
      />
      <Box textAlign="center" ref={scrollBottomRef}>
        {isMobile ? (
          <MobileButtons isPaused={isPaused} onTogglePause={onTogglePause} onCancel={onCancel} />
        ) : (
          <DesktopButtons isPaused={isPaused} onTogglePause={onTogglePause} onCancel={onCancel} />
        )}
      </Box>
    </>
  );
}

export default NewMessage;
