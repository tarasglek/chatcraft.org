import {
  Flex,
  Grid,
  GridItem,
  Heading,
  Center,
  Card,
  CardBody,
  CardHeader,
  Text,
  Container,
  Icon,
  CardFooter,
  Button,
  Box,
  Code,
} from "@chakra-ui/react";
import { MdErrorOutline } from "react-icons/md";

import Header from "./components/Header";
import { useRouteError } from "react-router-dom";

export default function AppError() {
  const err = useRouteError() as any;
  console.error(err);

  return (
    <Grid
      w="100%"
      h="100%"
      gridTemplateRows="min-content 1fr"
      gridTemplateColumns="1fr"
      bgGradient="linear(to-b, white, gray.100)"
      _dark={{ bgGradient: "linear(to-b, gray.600, gray.700)" }}
    >
      <GridItem colSpan={2}>
        <Header searchText={""} onToggleSidebar={() => {}} />
      </GridItem>

      <GridItem>
        <Flex direction="column" h="100%" maxH="100%" px={1}>
          <Center h="100%">
            <Card size="md">
              <CardHeader>
                <Flex align="center" gap={2} ml={4}>
                  <Icon as={MdErrorOutline} boxSize={5} />
                  <Heading as="h2" size="md">
                    Error
                  </Heading>
                </Flex>
              </CardHeader>
              <CardBody>
                <Container>
                  <Flex direction="column" gap={4}>
                    <Code colorScheme="gray" variant="outline">
                      {err ? err.toString() : "Unknown Error"}
                    </Code>
                    <Text>
                      Please <strong>close all other ChatCraft tabs and refresh</strong>.
                    </Text>
                    <Text>
                      If the problem persists,{" "}
                      <a
                        href="https://github.com/tarasglek/chatcraft.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="GitHub Repository"
                        title="GitHub Repository"
                        style={{ textDecoration: "underline" }}
                      >
                        file an issue
                      </a>{" "}
                      so we can investigate further. See the DevTools Console for more error info.
                    </Text>
                  </Flex>
                </Container>
              </CardBody>
              <CardFooter>
                <Box w="100%" textAlign="right">
                  <Button
                    colorScheme="red"
                    size="sm"
                    onClick={() => {
                      location.href = "/";
                    }}
                  >
                    Refresh
                  </Button>
                </Box>
              </CardFooter>
            </Card>
          </Center>
        </Flex>
      </GridItem>
    </Grid>
  );
}
