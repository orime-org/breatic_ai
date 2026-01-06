// src/workspace.tsx
import { ConfigProvider, App, Spin } from "antd";
import enUS from "antd/locale/en_US";
import jaJP from "antd/locale/ja_JP";
import { default as zhCN } from "antd/locale/zh_CN";
import zhTW from "antd/locale/zh_TW";
import React, { useEffect, Suspense, useContext, useState } from "react";
import ReactDOM from "react-dom/client";
import { IntlProvider } from "react-intl";
import userApi from "./api/userApi";
import { setMessageApi } from "./api/messageApi";
import { IUserContexts, UserContexts } from "./contexts/user-contexts";
import { IWorkspaceContexts, WorkspaceContexts } from "./contexts/workspace-contexts";
import "./globals.css";
import "./i18n/workspace-i18n"; // 引入i18n配置
import { UserInfoType } from "./libs/interfaces";
import AuthenticatedHelper from "./libs/authenticated-helper";
import { ANT_DESIGN_TOKEN } from "./styles/ant-design-token";
import { LANGUAGE } from "./libs/global-config";
import { BrowserRouter } from "react-router-dom";
import { HAS_ACCOUNT_MODE } from "./libs/global-config";
import LottiePlayer from "@/components/common/LottiePlayer";
import animationData from "@/components/common/LottiePlayer/loadingAnimation.json";
import authService from "./libs/auth-service";

const Workspace = React.lazy(() => import("./components/Workspace"));

import SafeImage from "./components/common/SafeImage";
window.SafeImage = SafeImage;

// 定义 SUPPORTED_LANGUAGES 的类型
const SUPPORTED_LANGUAGES = {
  "en-US": { value: "en", label: "English" },
  "zh-CN": { value: "cn", label: "简体中文" },
  "zh-TW": { value: "tw", label: "繁體中文" },
  "ja-JP": { value: "ja", label: "日本語" },
} as const;

type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

// 获取用户的语言设置
const getBrowserLanguage = (): LanguageCode => {
  // const savedLanguage = localStorage.getItem(LANGUAGE) as LanguageCode | null;
  // if (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage]) {
  //   return savedLanguage;
  // }
  // const browserLang = navigator.language || (navigator as any).userLanguage;
  // if (SUPPORTED_LANGUAGES[browserLang as LanguageCode]) {
  //   return browserLang as LanguageCode;
  // }
  return "en-US";
};

// 根据语言设置加载对应的 Ant Design 语言包和翻译
const antdLocale = {
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  "ja-JP": jaJP,
};

const messages = {
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  "ja-JP": jaJP,
};

// 创建一个内部组件来使用 App.useApp
const AppContent: React.FC = () => {
  const { message: messageApi } = App.useApp();

  // 初始化全局 message API
  useEffect(() => {
    setMessageApi(messageApi);
  }, [messageApi]);

  const [userInfo, setUserInfo] = useState<UserInfoType>();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // 数据加载Loading
  const [isWorkspaceDataLoading, setIsWorkspaceDataLoading] = useState(true);

  // 获取用户信息
  useEffect(() => {
    (async () => {
      //初始化无账号模式
      if (!HAS_ACCOUNT_MODE) {
        AuthenticatedHelper.setAuthenticatedInfo({
          state: {
            isAuthenticated: true,
            token: "ThisIsATemporaryToken",
          },
          version: 0,
        });
        setIsAuthenticated(true);
      } else {
        const authInfo = AuthenticatedHelper.getAuthenticatedInfo();
        setIsAuthenticated(authInfo?.state.isAuthenticated ?? false);
        if (authInfo?.state.isAuthenticated) {
          const data = await userApi.getUserInfo();
          if (!data.success) return;
          setUserInfo(data.result?.data);
        }
      }
    })();
  }, []);

  const userValue = React.useMemo(
    () => ({
      userInfo,
      setUserInfo,

      isAuthenticated,
      setIsAuthenticated,
    }),
    [userInfo, isAuthenticated]
  );

  const workspaceValue = React.useMemo(
    () => ({
      isWorkspaceDataLoading,
      setIsWorkspaceDataLoading,
    }),
    [isWorkspaceDataLoading]
  );

  useEffect(() => {
    authService.registerLogoutCallback(() => {
      setIsAuthenticated(false);
      setUserInfo(undefined);
    });
  }, []);

  return (
    <UserContexts.Provider value={userValue as IUserContexts}>
      <WorkspaceContexts.Provider value={workspaceValue as IWorkspaceContexts}>
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-[1111]" style={{ width: 128, height: 128 }}>
              <LottiePlayer animationData={animationData} loop autoplay />
            </div>
          }
        >
          <Workspace />
        </Suspense>
      </WorkspaceContexts.Provider>
    </UserContexts.Provider>
  );
};

const MainApp: React.FC = () => {
  const language = getBrowserLanguage();

  return (
    <IntlProvider locale={language} messages={messages[language as keyof typeof messages] as any}>
      <ConfigProvider theme={ANT_DESIGN_TOKEN} locale={antdLocale[language] || enUS}>
        <App>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </App>
      </ConfigProvider>
    </IntlProvider>
  );
};

ReactDOM.createRoot(document.getElementById("workspace_root")!).render(<MainApp />);
