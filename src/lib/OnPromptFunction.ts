export type PromptFunctionOptions = {
  prompt?: string;
  imageUrls?: string[];
  retry?: boolean;
};

export type OnPromptFunction = (options?: PromptFunctionOptions) => void;
