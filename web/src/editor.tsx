// src/editor.tsx
import { ConfigProvider, App, Spin, message } from "antd";
import enUS from "antd/locale/en_US";
import jaJP from "antd/locale/ja_JP";
import { default as zhCN } from "antd/locale/zh_CN";
import zhTW from "antd/locale/zh_TW";
import React, { useEffect, useCallback, useMemo, useState, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { IntlProvider } from "react-intl";
import userApi from "./api/userApi";
import { setMessageApi } from "./api/messageApi";
import { IUserContexts, UserContexts } from "./contexts/user-contexts";
import { IEditorContexts, EditorContexts } from "./contexts/editor-contexts";
import "./components/Editor/Components/SceneEditor/VideoEditor/i18n";
import { UserInfoType } from "./libs/interfaces";
import AuthenticatedHelper from "./libs/authenticated-helper";
import { ANT_DESIGN_TOKEN } from "./styles/ant-design-token";
import { HAS_ACCOUNT_MODE, LANGUAGE } from "./libs/global-config";
import { BrowserRouter } from "react-router-dom";
import editService from "./libs/edit-service";
import InvlidateModal from "@/components/common/InvalidateModal";
import LottiePlayer from "@/components/common/LottiePlayer";
import animationData from "@/components/common/LottiePlayer/loadingAnimation.json";
import authService from "./libs/auth-service";

const Editor = React.lazy(() => import("./components/Editor"));

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

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isShowInvalidate, setIsShowInvalidate] = useState(false);

  // 刷新积分
  const refreshCredits = useCallback(async () => {
    if (!isAuthenticated) return;
    const res = await userApi.getCreditsRecord();
    if (res.success && res.result?.code === 0) {
      const creditsData = res.result.data;
      // 更新UserInfo credits
      setUserInfo((prev) => (prev ? { ...prev, credits: creditsData?.totalCredits ?? prev.credits } : prev));
    }
  }, [isAuthenticated, messageApi]);

  // 注册invalid的回调
  useEffect(() => {
    editService.registerInvalidateCallback(() => {
      setIsShowInvalidate(true);
    });
  }, []);

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

  const userValue = useMemo(
    () => ({
      userInfo,
      setUserInfo,

      isAuthenticated,
      setIsAuthenticated,

      refreshCredits,
    }),
    [userInfo, isAuthenticated, refreshCredits]
  );

  // 编辑器上下文值
  const editorValue = useMemo(
    () => ({
      isDataLoading,
      setIsDataLoading,

      isShowInvalidate,
      setIsShowInvalidate,
    }),
    [isDataLoading, isShowInvalidate]
  );

  //by soongxl to set logout callback
  useEffect(() => {
    authService.registerLogoutCallback(() => {
      setIsAuthenticated(false);
      setUserInfo(undefined);
      window.location.href = "/workspace";
    });
  }, []);

  return (
    <UserContexts.Provider value={userValue as IUserContexts}>
      <EditorContexts.Provider value={editorValue as IEditorContexts}>
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-[1111]" style={{ width: 128, height: 128 }}>
                <LottiePlayer animationData={animationData} loop autoplay />
            </div>
          }
        >
          <Editor />
        </Suspense>
        <InvlidateModal isShowInvalidate={isShowInvalidate} setIsShowInvalidate={setIsShowInvalidate} />
      </EditorContexts.Provider>
    </UserContexts.Provider>
  );
};

const MainApp: React.FC = () => {
  const language = getBrowserLanguage();

  const [validProjectId, setValidProjectId] = useState<boolean>(false);

  // 获取用户信息
  useEffect(() => {
    const path = window?.location.pathname || "";
    const match = path.match(/^\/editor\/([^\/?#]+)/);
    if (match && match?.[1]) setValidProjectId(true);
    else {
      window.location.href = "/workspace";
    }
  }, []);

  if (!validProjectId) return null;

  //有效
  return (
    <IntlProvider locale={language} messages={messages[language as keyof typeof messages] as any}>
      <ConfigProvider theme={ANT_DESIGN_TOKEN} locale={antdLocale[language] || enUS} wave={{ disabled: true }}>
        <App style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </App>
      </ConfigProvider>
    </IntlProvider>
  );
};

ReactDOM.createRoot(document.getElementById("editor_root")!).render(<MainApp />);
