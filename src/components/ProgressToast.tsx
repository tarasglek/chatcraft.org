import { Box, Flex, IconButton, Progress, Text } from "@chakra-ui/react";
import { AlertArguments } from "../hooks/use-alert";
import { ProgressCircleRing, ProgressCircleRoot } from "./ui/progress-circle";
import { RxCross2 } from "react-icons/rx";
import { useTheme } from "next-themes";

type ProgressAlertArguements = AlertArguments & {
  progressPercentage: number;
  showPercentage: boolean;
  onClose?: () => void;
};

function ProgressToast({
  title,
  message,
  progressPercentage,
  showPercentage,
  onClose,
}: ProgressAlertArguements) {
  const { theme } = useTheme();

  const bgColor = theme === "light" ? "blue.600" : "blue.200";
  const color = theme === "light" ? "white" : "black";
  const colorScheme = theme === "light" ? "whatsapp" : "gray";

  return (
    <Flex
      bgColor={bgColor}
      color={color}
      p={3}
      gap={5}
      flexDirection={"column"}
      justifyContent={"center"}
      rounded={"md"}
      position={"relative"}
    >
      {/* Close Button */}
      {onClose && (
        <IconButton
          position={"absolute"}
          display={"flex"}
          bgColor={"transparent"}
          alignItems={"center"}
          top={0}
          right={0}
          aria-label="Cancel Process"
          onClick={onClose}
          _active={{}} // remove active effects
          size={"sm"}
        >
          <RxCross2 />
        </IconButton>
      )}

      <Flex alignItems={"center"} gap={5}>
        <ProgressCircleRoot color="black">
          <ProgressCircleRing
            css={{
              "--thickness": "5px",
            }}
          />
        </ProgressCircleRoot>

        <Box>
          <Text as={"h2"} fontSize={"md"} fontWeight={"bold"}>
            {title}
          </Text>
          {message && <Text>{message}</Text>}
        </Box>
      </Flex>

      {/* The 'css' hack is to animate the progress bar as value changes */}
      <Flex alignItems={"center"} gap={2}>
        {showPercentage && <Text>{progressPercentage}%</Text>}
        <ProgressCircleRoot
          flexGrow={1}
          value={progressPercentage}
          size="xs"
          colorScheme={colorScheme}
          css={{
            "> div:first-of-type": {
              transition: "width 500ms ease-in-out",
            },
          }}
        >
          <Progress.Track />
        </ProgressCircleRoot>
      </Flex>
    </Flex>
  );
}

export default ProgressToast;
