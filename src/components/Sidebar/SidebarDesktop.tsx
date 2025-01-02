import { Box } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import SidebarContent, { SidebarContentProps } from "./SidebarContent";

type SidebarDesktopProps = SidebarContentProps & {
  isSidebarVisible: boolean;
};

function SidebarDesktop({ isSidebarVisible, selectedChat, selectedFunction }: SidebarDesktopProps) {
  const sidebarOpenAnimationKeyframes = keyframes`
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  `;

  const sidebarCloseAnimationKeyframes = keyframes`
    from {
      transform: scaleX(1);
    }

    to {
      transform: scaleX(0);
    }
  `;

  const sidebarOpenAnimation = `${sidebarOpenAnimationKeyframes} 500ms ease-in-out forwards`;
  const sidebarCloseAnimation = `${sidebarCloseAnimationKeyframes} 100ms ease-in-out forwards`;

  return (
    <Box
      transformOrigin={"left"}
      animation={isSidebarVisible ? sidebarOpenAnimation : sidebarCloseAnimation}
    >
      <SidebarContent selectedChat={selectedChat} selectedFunction={selectedFunction} />
    </Box>
  );
}

export default SidebarDesktop;
