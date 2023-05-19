type LoginPostResponse = {
  code: string;
  state?: string;
};

type AccessTokenResponse = {
  error?: string;
  access_token: string;
};
