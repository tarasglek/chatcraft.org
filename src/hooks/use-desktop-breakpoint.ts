import { useMediaQuery } from "@chakra-ui/react";

// Use 480 as our upper limit for the "mobile" experience.
const desktopMediaQuery = "(min-width: 1496px)";

export default function useDesktopBreakpoint() {
  const [isDesktop] = useMediaQuery(desktopMediaQuery);

  return isDesktop;
}
