import { useMediaQuery } from "@chakra-ui/react";

// Use 480 as our upper limit for the "mobile" experience.
const mobileMediaQuery = ["(max-width: 480px)"];

export default function useMobileBreakpoint() {
  const [isMobile] = useMediaQuery(mobileMediaQuery, {
    ssr: false,
  });

  return isMobile;
}
