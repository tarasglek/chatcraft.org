import useMobileBreakpoint from "../../hooks/use-mobile-breakpoint";
import { ChatCraftChat } from "../../lib/ChatCraftChat";
import { ChatCraftFunction } from "../../lib/ChatCraftFunction";
import SidebarDesktop from "./SidebarDesktop";
import SidebarMobile from "./SidebarMobile";

type SidebarProps = {
  searchText?: string; // For the search field in mobile sidebar
  selectedChat?: ChatCraftChat;
  selectedFunction?: ChatCraftFunction;
  isSidebarVisible: boolean;
  handleToggleSidebarVisible: () => void;
};

export default function Sidebar(props: SidebarProps) {
  const isMobile = useMobileBreakpoint();

  return isMobile ? <SidebarMobile {...props} /> : <SidebarDesktop {...props} />;
}
