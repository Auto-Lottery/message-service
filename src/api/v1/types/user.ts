export type LoginData = {
  phoneNumber: string;
  otpCode: string;
};

export type User = {
  phoneNumber: string;
  operator: string;
  _id: string;
  createdDate?: number;
};

export type UserWithToken = {
  accessToken: string;
} & User;
