// Models we expect to use. See
// https://platform.openai.com/docs/models/overview
// https://github.com/hwchase17/langchainjs/blob/9330102c98c30eb4796263f2dfba9d8cbb4d179c/langchain/src/base_language/count_tokens.ts#L34-L49
type GptModel =
  // GPT-4
  | "gpt-4"
  // GPT-3.5
  | "gpt-3.5-turbo";

// Enter key either sends message or adds newline
type EnterBehaviour = "send" | "newline";

// Settings
type Settings = {
  apiKey?: string;
  model: GptModel;
  enterBehaviour: EnterBehaviour;
  justShowMeTheCode: boolean;
  countTokens: boolean;
};

// Information about tokens in a chat
type TokenInfo = {
  count: number;
  cost?: number;
};

type User = {
  name: string;
  username: string;
  token: string;
  avatarUrl: string;
};
