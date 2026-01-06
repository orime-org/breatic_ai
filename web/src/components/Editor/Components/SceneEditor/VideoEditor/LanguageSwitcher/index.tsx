import React from "react";
import { useTranslation } from "react-i18next";
import { Select } from "antd";
import { GlobalOutlined } from "@ant-design/icons";

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const handleChange = (value: string) => {
    i18n.changeLanguage(value);
    // 保存到 localStorage
    localStorage.setItem("language", value);
  };

  return (
    <Select
      value={i18n.language}
      onChange={handleChange}
      style={{ width: 110, height: "26px", fontSize: "12px" }}
      className="language-switcher-select"
      classNames={{
        popup: {
          root: "language-switcher-dropdown",
        },
      }}
      suffixIcon={<GlobalOutlined />}
      // dropdownClassName="language-switcher-dropdown"
      options={[
        { value: "zh", label: "简体中文" },
        { value: "zh-TW", label: "繁體中文" },
        { value: "en", label: "English" },
        { value: "ja", label: "日本語" },
      ]}
    />
  );
};

export default LanguageSwitcher;
