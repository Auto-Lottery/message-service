export type CustomResponseError = {
  code: 500;
  message: string;
};

export type CustomResponseData<T> = {
  code: 200;
  data: T;
};

export type CustomResponse<T> = CustomResponseData<T> | CustomResponseError;
