import axios from "axios";
import { AUTH_SERVICE_URL } from "../config";
import { CustomResponse } from "../types/custom-response";
import { User } from "../types/user";
import { errorLog } from "../utilities/log";

export class AuthApiService {
  constructor() {}

  async register(phoneNumber: string): Promise<CustomResponse<User>> {
    try {
      const res = await axios.post(`${AUTH_SERVICE_URL}/v1/auth/register`, {
        phoneNumber: phoneNumber
      });
      return res.data;
    } catch (err) {
      if (err instanceof Error) {
        return {
          code: 500,
          message: err.message
        };
      }
      errorLog("AUTH API REGISTER CALL ERR::: ", err);
      return {
        code: 500,
        message: "Бүртгэл амжилтгүй"
      };
    }
  }
}
