export type CreateAccountDTO = {
  name: string;
  email: string;
  password: string;
  role: string;
};

export type LoginDTO = {
  email: string;
  password: string;
};

export type RefreshTokenDTO = {
  refreshToken: string;
};

export type UpdatePasswordDTO = {
  token: string;
  password: string;
};

export type ClientCredentialsDTO = {
  clientId: string;
  clientSecret: string;
};
