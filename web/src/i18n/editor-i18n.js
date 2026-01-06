import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enBase from "./locales/en/base.json";
import jaBase from "./locales/ja/base.json";
import zhCNBase from "./locales/zh-CN/base.json";
import zhTWBase from "./locales/zh-TW/base.json";

import enExtra from "./locales/en/extra.json";
import jaExtra from "./locales/ja/extra.json";
import zhCNExtra from "./locales/zh-CN/extra.json";
import zhTWExtra from "./locales/zh-TW/extra.json";

import enEditor from "./locales/en/editor.json";
import jaEditor from "./locales/ja/editor.json";
import zhCNEditor from "./locales/zh-CN/editor.json";
import zhTWEditor from "./locales/zh-TW/editor.json";

// 这里之所以不import { LANGUAGE } from '../libs/constants.ts'，是因为会有循环引用的问题
const language = localStorage.getItem("language");
i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: {
        ...enEditor,
        ...enExtra,
        ...enBase, 
      },
    },
    ja: {
      common: {
        ...jaEditor,
        ...jaExtra,
        ...jaBase,
      },
    },
    "zh-CN": {
      common: {
        ...zhCNEditor,
        ...zhCNExtra,
        ...zhCNBase,
      },
    },
    "zh-TW": {
      common: {
        ...zhTWEditor,
        ...zhTWExtra,
        ...zhTWBase,
      },
    },
  },
  lng: language || "en",
  fallbackLng: "en",
  defaultNS: "common",
  debug: false,
  interpolation: {
    escapeValue: false,
  },
  ns: [
    "common",
  ],
});

export default i18n;
