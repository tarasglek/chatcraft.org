import {
  Box,
  CircularProgress,
  Flex,
  IconButton,
  Progress,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { AlertArguments } from "../hooks/use-alert";
import { MdMinimize } from "react-icons/md";

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
  return (
    <Flex
      bgColor={useColorModeValue("blue.600", "blue.200")}
      color={useColorModeValue("white", "black")}
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
          right={2}
          aria-label="Minimize Download Progress"
          onClick={onClose}
          _hover={{}} // Remove hover
          _active={{}} // and active effects
          size={"xs"}
          icon={<MdMinimize size={"xs"} />}
        ></IconButton>
      )}

      <Flex alignItems={"center"} gap={5}>
        <CircularProgress isIndeterminate thickness={5} color="black" />

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
        <Progress
          flexGrow={1}
          value={progressPercentage}
          size="xs"
          colorScheme={useColorModeValue("whatsapp", "gray")}
          css={{
            "> div:first-of-type": {
              transition: "width 500ms ease-in-out",
            },
          }}
        />
      </Flex>
    </Flex>
  );
}

export default ProgressToast;
