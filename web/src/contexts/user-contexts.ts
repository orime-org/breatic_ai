import { createContext } from "react";
import { UserInfoType } from "../libs/interfaces";

export interface IUserContexts {
  userInfo: UserInfoType;
  setUserInfo: (userInfo: UserInfoType | undefined) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  refreshCredits: () => Promise<void>;
}

export const UserContexts = createContext<IUserContexts>({} as IUserContexts);
