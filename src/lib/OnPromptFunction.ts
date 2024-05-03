export type OnPromptFunction = (options?: {
  prompt?: string;
  imageUrls?: string[];
  retry?: boolean;
}) => void;
