import { Flex, Progress, Text, useColorModeValue } from "@chakra-ui/react";
import { AlertArguments } from "../hooks/use-alert";

type ProgressAlertArguements = AlertArguments & {
  progressPercentage: number;
};

function ProgressToast({ title, message, progressPercentage }: ProgressAlertArguements) {
  return (
    <Flex
      bgColor={useColorModeValue("blue.600", "blue.200")}
      color={useColorModeValue("white", "black")}
      p={3}
      gap={1}
      flexDirection={"column"}
      justifyContent={"center"}
      rounded={"md"}
    >
      <Text as={"h2"} fontSize={"md"} fontWeight={"bold"}>
        {title}
      </Text>

      {message && <Text>{message}</Text>}

      <Progress variant={"ghost"} value={progressPercentage} size="xs" colorScheme="gray" />
    </Flex>
  );
}

export default ProgressToast;
