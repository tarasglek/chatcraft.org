type AccessTokenResponse = {
  error?: string;
  access_token: string;
};

type UserInfoResponse = {
  login: string;
  name: string;
  avatar_url: string;
};

type ValidateTokenResponse = {
  user: { login: string };
};
