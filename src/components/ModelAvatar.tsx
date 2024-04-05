import { Avatar } from "@chakra-ui/react";

import { ChatCraftModel } from "../lib/ChatCraftModel";

export default function ModelAvatar({ model, size }: { model: ChatCraftModel; size: "sm" | "xs" }) {
  const { id, logoUrl, logoBg, prettyModel } = model;

  // Differentiate OpenAI models by colour
  if (id.includes("gpt-4")) {
    return <Avatar size={size} bg="#A96CF9" src={logoUrl} title={prettyModel} />;
  } else if (id.includes("gpt-3.5-turbo")) {
    return <Avatar size={size} bg="#75AB9C" src={logoUrl} title={prettyModel} />;
  }

  return (
    <Avatar
      size={size}
      bg={logoBg}
      showBorder
      borderColor="gray.100"
      _dark={{ borderColor: "gray.600" }}
      src={logoUrl}
      name={prettyModel}
      title={prettyModel}
    />
  );
}
