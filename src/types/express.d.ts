import { User } from "../api/v1/types/user";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
