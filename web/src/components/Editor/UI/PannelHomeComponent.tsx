/**
 * @file PannelHomeComponent.tsx
 * @description 编辑器左上角的主面板组件，包含返回工作区、创建新项目、返回首页等功能，以及项目标题的显示和编辑。
 */
import { App, Dropdown, Input, Modal } from "antd";
import type { InputRef, MenuProps } from "antd";
import React, { useEffect, useRef, useState } from "react";
import useStore from "../Store/store";
import { BreaticLogo_Svg, PannelHomeComponent_BackToWorkSpace_Svg, PannelHomeComponent_CreateNewProject_Svg, PannelHomeComponent_GoToHome_Svg, WorkspaceHomeLogo_Svg } from "../SvgLoader/staticIcon";
import editorApi from "../../../api/editorApi";

/**
 * 将 ISO 时间字符串格式化为 "HH:MM"
 *
 * @param isoString 类似 "2025-12-05T08:44:42.049678+00:00" 的时间
 * @returns "HH:MM"（24 小时制，始终补零，如 "08:44"）
 */
export const formatToHourMinute = (isoString: string): string => {
  const date = new Date(isoString);

  // 如果解析失败（Invalid Date），兜底返回 00:00
  if (isNaN(date.getTime())) return "00:00";

  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");

  return `${h}:${m}`;
};

const PannelHomeComponent: React.FC = () => {
  // 工作流信息更新函数
  const setWorkflowInfoByKey = useStore((s) => s.setWorkflowInfoByKey);

  // 工作流变更时间
  const workflowChangeTime = useStore((s) => s.workflowInfo?.update_time || s.workflowInfo?.create_time || "");

  // 工作流名称
  const workflowName = useStore((s) => s.workflowInfo?.workflow_name);

  // 下拉菜单可见状态
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // 下拉菜单项
  const menuItems: MenuProps["items"] = [
    {
      key: "back-to-workspace",
      label: (
        <div className="flex items-center gap-2 p-3 rounded-[3px] text-[14px] leading-[17px] font-normal text-[#000000] bg-[#FFFFFF] hover:bg-[#F3F3F3]">
          <PannelHomeComponent_BackToWorkSpace_Svg />
          Back to Workspace
        </div>
      ),
    },
    {
      key: "create-new-project",
      label: (
        <div className="flex items-center gap-2 p-3 rounded-[3px] text-[14px] leading-[17px] font-normal text-[#000000] bg-[#FFFFFF] hover:bg-[#F3F3F3]">
          <PannelHomeComponent_CreateNewProject_Svg />
          Create New Project
        </div>
      ),
    },
    {
      key: "go-to-home",
      label: (
        <div className="flex items-center gap-2 p-3 rounded-[3px] text-[14px] leading-[17px] font-normal text-[#000000] bg-[#FFFFFF] hover:bg-[#F3F3F3]">
          <PannelHomeComponent_GoToHome_Svg />
          Go To Home
        </div>
      ),
    },
  ];

  const [title, setTitle] = useState(workflowName || "Title");
  const [autoSaveTime, setAutoSaveTime] = useState(formatToHourMinute(workflowChangeTime));
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<InputRef>(null);
  const renameModalInputRef = useRef<InputRef>(null);
  const { message: messageApi } = App.useApp();

  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameModalInput, setRenameModalInput] = useState("");

  // 监听 store 中的 workflowName 变化，同步更新本地 title
  useEffect(() => {
    if (workflowName) {
      setTitle(workflowName);
    }
  }, [workflowName]);

  // 标题编辑状态变更时更新输入框焦点
  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
    }
  }, [isEditingTitle]);

  // 工作流内容变更时同步UI 对应的变更时间显示
  useEffect(() => {
    setAutoSaveTime(formatToHourMinute(workflowChangeTime));
  }, [workflowChangeTime]);

  // 处理菜单点击事件
  const handleMenuClick: MenuProps["onClick"] = async ({ key }) => {
    setDropdownVisible(false);

    switch (key) {
      case "back-to-workspace":
        window.location.href = "/workspace";
        break;
      case "create-new-project":
        setRenameModalOpen(true);
        break;
      case "go-to-home":
        window.open("/", "_blank");
        break;
    }
  };

  // Modal 打开时自动聚焦输入框
  useEffect(() => {
    if (renameModalOpen) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          renameModalInputRef.current?.focus();
        });
      });
    }
  }, [renameModalOpen]);

  // 创建工作流
  const handleCreateWorkflowClickEvent = async () => {
    if (!renameModalInput) {
      messageApi.warning("Project name cannot be empty");
      return;
    }

    setRenameModalOpen(false);
    setRenameModalInput("");

    const res = await editorApi.createWorkflow({
      workflow_name: renameModalInput,
    });
    if (res.success && res.result?.code === 0 && res.result?.data) {
      const data = res.result.data;
      const workflowId = data.id;

      if (!workflowId) {
        return;
      }

      // 跳转到编辑器页并携带参数
      // window.location.href = `/editor/${String(workflowId)}`;
      window.open(`/editor/${String(workflowId)}`, "_blank");
    } else {
      messageApi.error(res.result?.msg || "Failed to create workflow");
    }
  };

  /**
   * 处理标题输入变化
   * @param e 输入事件
   */
  const handleTitleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setWorkflowInfoByKey("workflow_name", e.target.value);
  };

  return (
    <div className="relative z-30 h-full flex items-center gap-3 bg-transparent">
      {/* Logo 部分 */}
      <Dropdown
        menu={{
          items: menuItems,
          onClick: handleMenuClick,
        }}
        trigger={["hover"]}
        placement="bottomLeft"
        open={dropdownVisible}
        classNames={{ root: "project-logo-dropdown" }}
        popupRender={(menu) => <div style={{ minWidth: "200px", marginTop: "12px", borderRadius: "5px" }}>{menu}</div>}
        onOpenChange={(open) => setDropdownVisible(open)}
      >
        <button type="button" id="radix-«r2»" aria-haspopup="menu" aria-expanded="false" data-state="closed" className="outline-none">
          <div className="flex items-center justify-between h-full cursor-pointer group outline-none">
            <div className={`flex items-center justify-center h-[32px] w-[32px] cursor-pointer relative gap-1 text-[#000000] hover:text-[#35C838] ${dropdownVisible ? "text-[#35C838]" : ""}`}>
              {/* <BreaticLogo_Svg className="block" color="currentColor" /> */}
              <WorkspaceHomeLogo_Svg className="block" color="currentColor" />
            </div>
          </div>
        </button>
      </Dropdown>

      {/* 标题编辑部分 */}
      <div className="inline-flex flex-col">
        <div className={`min-w-[60px] max-w-[142px] items-center panel-title-edit ${isEditingTitle ? "border-b border-transparent" : "border-b border-transparent hover:border-b-black border-dashed"}`} onClick={() => setIsEditingTitle(true)}>
          <Input
            ref={titleInputRef}
            className={`
                panel-title-input
                flex w-full p-0 m-0
                text-[18px] leading-[22px] font-medium text-left text-ellipsis text-nowrap overflow-hidden placeholder:text-muted-foreground
                bg-transparent
                border-0 outline-none
                disabled:cursor-not-allowed disabled:opacity-50
              `}
            maxLength={120}
            variant="borderless"
            title="Title"
            placeholder="Untitled"
            value={title}
            readOnly={!isEditingTitle}
            onChange={handleTitleOnChange}
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                setIsEditingTitle(false);
              }
            }}
            style={{ width: "130px", boxShadow: "none", fontSize: "16px" }}
          />
        </div>
        <span className="font-normal text-[12px] leading-[12px] text-left text-[#666666]">{`Autosaved at ${autoSaveTime}`}</span>
      </div>

      <Modal
        open={renameModalOpen}
        onCancel={() => setRenameModalOpen(false)}
        footer={null}
        title={null}
        width={472}
        centered
        destroyOnHidden
        className="rename-project-modal"
        classNames={{
          body: "rename-project-modal-content",
        }}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex flex-col items-center justify-center text-base font-bold py-6 px-[6px] gap-1 mt-6 gap-6 text-[#0C0C0D]">
            <p className="whitespace-nowrap">Enter the new project name, up to 128 characters</p>
            <div className="w-[428px] px-6 py-1.5 bg-[#F5F5F5] text-base font-bold leading-6 tracking-tight rounded-full inline-flex justify-center items-center gap-2.5">
              <Input
                ref={renameModalInputRef}
                value={renameModalInput}
                onChange={(e) => setRenameModalInput(e.target.value)}
                placeholder="Please enter the text hear"
                className="flex w-[380px] h-[24px] bg-[#F5F5F5] text-[#0C0C0D] !border-0 !outline-0 items-center justify-center"
                suffix={null}
                maxLength={128}
              />
            </div>
          </div>
          <div className="flex gap-6 py-3">
            <div className="px-6 py-1.5 flex items-center justify-center text-[16px] font-semibold rounded-full border border-[#E5E7EB] bg-[#1E1E1E] text-[#FFFFFF] cursor-pointer hover:bg-[#444444] transition-colors" onClick={() => setRenameModalOpen(false)}>
              Cancel
            </div>
            <div className="px-6 py-1.5 flex items-center justify-center text-[16px] font-semibold rounded-full bg-[#35C838] text-[#FFFFFF] cursor-pointer hover:bg-[#6DEF70] transition-colors" onClick={() => handleCreateWorkflowClickEvent()}>
              Confirm
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PannelHomeComponent;
