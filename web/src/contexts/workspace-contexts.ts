import { createContext } from "react";

export interface IWorkspaceContexts {
  isWorkspaceDataLoading: boolean;
  setIsWorkspaceDataLoading: (isWorkspaceDataLoading: boolean) => void;
}

export const WorkspaceContexts = createContext<IWorkspaceContexts>({} as IWorkspaceContexts);
