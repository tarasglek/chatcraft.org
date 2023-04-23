// Models we expect to use
type GptModel = "gpt-3.5-turbo" | "gpt-4";

// Enter key either sends message or adds newline
type EnterBehaviour = "send" | "newline";

// Settings
type Settings = {
  model: GptModel;
  enterBehaviour: EnterBehaviour;
  promptPanelHeight: number;
};
