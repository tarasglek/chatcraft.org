import { Box, CircularProgress, Flex, Progress, Text, useColorModeValue } from "@chakra-ui/react";
import { AlertArguments } from "../hooks/use-alert";

type ProgressAlertArguements = AlertArguments & {
  progressPercentage: number;
  showPercentage: boolean;
};

function ProgressToast({
  title,
  message,
  progressPercentage,
  showPercentage,
}: ProgressAlertArguements) {
  return (
    <Flex
      bgColor={useColorModeValue("blue.500", "blue.200")}
      color={useColorModeValue("white", "black")}
      p={3}
      gap={5}
      flexDirection={"column"}
      justifyContent={"center"}
      rounded={"md"}
    >
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
          colorScheme="whatsapp"
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
