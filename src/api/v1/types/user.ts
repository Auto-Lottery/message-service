export type LoginData = {
  phoneNumber: string;
  otpCode: string;
};

export type User = {
  phoneNumber: string;
  operator: string;
  _id: string;
};

export type UserWithToken = {
  accessToken: string;
} & User;
