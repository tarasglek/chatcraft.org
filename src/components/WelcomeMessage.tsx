import {
  Avatar,
  Box,
  Card,
  Flex,
  Text,
  VStack,
  FormControl,
  FormLabel,
  Button,
  FormHelperText,
  Link,
  CardBody,
  Container,
  Select,
} from "@chakra-ui/react";
import RevealablePasswordInput from "./RevealablePasswordInput";

function WelcomeMessage() {
  return (
    <Card p={6} my={6}>
      <Flex>
        <Box pr={6}>
          <Avatar size="sm" src={`./android-chrome-192x192.png`} />
        </Box>
        <Box flex="1" maxWidth="100%" overflow="hidden" mt={1} mr="80px">
          <VStack gap={4} align="left">
            <Text>Welcome to ChatCraft.org, a developer focused AI assistant.</Text>
            <Text>
              ChatCraft is a <strong>Bring-Your-Own-API-Key</strong> personal AI Assistant. Before
              you can start chatting, you need to enter one or more API Keys for the language models
              you want to use.
            </Text>
            <Text as="em" fontSize="sm">
              NOTE: Your API Key(s) will be stored offline in your browser&apos;s{" "}
              <Link
                href="https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage"
                textDecoration="underline"
              >
                local storage
              </Link>
              .
            </Text>
            <form>
              <Container>
                <Card variant="outline">
                  <CardBody>
                    <VStack gap={2}>
                      <FormControl>
                        <FormLabel>OpenAI API Key</FormLabel>
                        <Flex>
                          <RevealablePasswordInput
                            flex="1"
                            type="password"
                            name="openai-api-key"
                            bg="white"
                            _dark={{ bg: "gray.700" }}
                            required
                          />
                        </Flex>
                        <FormHelperText></FormHelperText>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Anthropic Claude API Key</FormLabel>
                        <Flex>
                          <RevealablePasswordInput
                            flex="1"
                            type="password"
                            name="claude-api-key"
                            bg="white"
                            _dark={{ bg: "gray.700" }}
                            required
                          />
                        </Flex>
                        <FormHelperText></FormHelperText>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Choose your Default Model</FormLabel>
                        <Select defaultValue="gpt-3.5-turbo">
                          <option value="gpt-4">GPT-4</option>
                          <option value="gpt-3.5-turbo">ChatGPT (GPT-3.5-turbo)</option>
                        </Select>
                      </FormControl>

                      <Box w="100%" textAlign="right">
                        <Button type="submit">Save</Button>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>
              </Container>
            </form>
          </VStack>
        </Box>
      </Flex>
    </Card>
  );
}

export default WelcomeMessage;
