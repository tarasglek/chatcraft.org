import { Box, CircularProgress, Flex, Progress, Text, useColorModeValue } from "@chakra-ui/react";
import { AlertArguments } from "../hooks/use-alert";

type ProgressAlertArguements = AlertArguments & {
  progressPercentage: number;
};

function ProgressToast({ title, message, progressPercentage }: ProgressAlertArguements) {
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
      <Progress
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
  );
}

export default ProgressToast;
