import { createContext } from "react";

export interface IEditorContexts {
  isDataLoading: boolean;
  setIsDataLoading: (isDataLoading: boolean) => void;
  isShowInvalidate: boolean;
  setIsShowInvalidate: (isShowInvalidate: boolean) => void;
}

export const EditorContexts = createContext<IEditorContexts>({} as IEditorContexts);
