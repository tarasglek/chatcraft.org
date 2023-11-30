import { useMediaQuery } from "@chakra-ui/react";

// Use 1496 as lower limit for the "desktop" experience.
const desktopMediaQuery = "(min-width: 1496px)";

export default function useDesktopBreakpoint() {
  const [isDesktop] = useMediaQuery(desktopMediaQuery);

  return isDesktop;
}
