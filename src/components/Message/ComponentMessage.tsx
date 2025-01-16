import { type ReactNode } from "react";
import { Box, Card, CardBody, CardFooter, CardHeader, Flex, Heading } from "@chakra-ui/react";

interface ComponentMessageProps {
  heading?: string;
  headingMenu?: ReactNode;
  avatar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * A Message that contains a tree of React components vs. a message
 */
function ComponentMessage({
  heading,
  headingMenu,
  avatar,
  footer,
  children,
}: ComponentMessageProps) {
  return (
    <Box my={5} flex={1}>
      <Card>
        <CardHeader p={0} pt={3} pb={2} pr={1}>
          <Flex justify="space-between" align="center" ml={5} mr={2}>
            <Flex gap={3}>
              {avatar && <Box>{avatar}</Box>}
              <Flex direction="column" justify="center">
                <Flex h="100%" align="center" gap={2}>
                  <Flex
                    direction={{ base: "column", sm: "row" }}
                    align={{ base: "flex-start", sm: "center" }}
                    justify="space-between"
                    w="100%"
                    gap={{ base: 0, sm: 2 }}
                  >
                    {heading && (
                      <Heading as="h2" size="xs" minW="fit-content">
                        {heading}
                      </Heading>
                    )}
                  </Flex>
                  {headingMenu}
                </Flex>
              </Flex>
            </Flex>
          </Flex>
        </CardHeader>

        <CardBody p={0}>
          <Flex direction="column" gap={3}>
            <Box maxWidth="100%" minH="2em" overflow="hidden" px={5} pb={2}>
              {children}
            </Box>
          </Flex>
        </CardBody>

        {footer && <CardFooter py={2}>{footer}</CardFooter>}
      </Card>
    </Box>
  );
}

export default ComponentMessage;
