// Enter key either sends message or adds newline
type EnterBehaviour = "send" | "newline";

// Information about tokens in a chat
type TokenInfo = {
  count: number;
  cost?: number;
};

interface SystemProvider {
  apiUrl: string;
  defaultModel: string;
  apiKey: string;
  isSystemProvider: true;
}

type SystemProviders = Record<string, SystemProvider>;

type User = {
  name: string;
  username: string;
  avatarUrl: string;
  email: string | null;
};

type JwtTokenPayload = {
  aud: string;
  sub: string;
  user: User;
};
