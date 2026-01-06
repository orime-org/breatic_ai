/**
 * 项目列表项组件
 */
import { App, Button, Dropdown, Input, InputRef, MenuProps, Modal } from "antd";
import React, { useEffect, useRef, useState } from "react";
import extendIcon from "./../../../../assets/images/icons/extend_icon.svg";
import dashboardApi from "../../../api/workflowApi";
import { ProjectItemObj } from "./../../../libs/interfaces";
import style from "./style.module.css";
import { Workspace_ProjectItem_Copy_Svg, Workspace_ProjectItem_Edit_Svg, NodeToolBar_DeleteSvg, Workspace_ProjectTools_Svg, Workspace_ProjectItem_Delete_Svg } from "../../Editor/SvgLoader/staticIcon";
import cover1x from "@/assets/images/pages/workspace/defultpicture-1.png";
import cover2x from "@/assets/images/pages/workspace/defultpicture@2x.png";
import cover4x from "@/assets/images/pages/workspace/defultpicture@4x.png";
import coverDefault from "@/assets/images/pages/workspace/defultpicture.png";

interface IProps {
  projectItem: ProjectItemObj;
  projectList: ProjectItemObj[];
  setProjectList: (projectList: ProjectItemObj[]) => void;
}

/**
 * 格式化日期为 YYYY-MM-DD HH:mm:ss 格式
 * @param isoString - 符合 ISO 8601 格式的日期字符串
 * @returns 格式化后的日期字符串
 */
function formatDate(isoString: string) {
  const date = new Date(isoString);

  const pad = (n: number) => String(n).padStart(2, "0");

  const Y = date.getFullYear();
  const M = pad(date.getMonth() + 1);
  const D = pad(date.getDate());
  const h = pad(date.getHours());
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());

  return `${Y}-${M}-${D} ${h}:${m}:${s}`;
}

const ProjectItem: React.FC<IProps> = ({ projectItem, projectList, setProjectList }: IProps) => {
  const { message: messageApi } = App.useApp();
  // 复制项目弹窗
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  // 删除项目弹窗
  const [delModalOpen, setDelModalOpen] = useState(false);
  // 重命名项目弹窗
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  // 重命名输入框内容
  const [renameModalInput, setRenameModalInput] = useState("");

  // 重命名工作流弹窗输入框内容
  const workflowNameInputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (renameModalOpen) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          workflowNameInputRef.current?.focus();
        });
      });
    }
  }, [renameModalOpen]);

  // 复制项目
  const copyProject = async () => {
    const res = await dashboardApi.copyProject(projectItem.id);
    if (res.success && res.result?.code === 0) {
      let newState = [...projectList];
      const index = projectList.findIndex((item: ProjectItemObj) => item.id === projectItem.id);

      if (index !== -1) {
        const newItem = {
          ...projectList[index],
          id: res.result.data.id,
          workflow_name: res.result.data.workflow_name,
        }; // 复制对象并生成新的key
        newState.unshift(newItem); // 将新项目插入到数组最前面
      }
      setProjectList(newState);
      messageApi.success("Copy successful");
    } else {
      if (res.result?.msg) {
        messageApi.error(res.result.msg);
      }
    }
  };

  // 删除项目
  const deleteProject = async () => {
    const res = await dashboardApi.deleteProject(projectItem.id);
    if (res.success && res.result?.code === 0) {
      messageApi.success("Delete successful");
      setProjectList(projectList.filter((item) => item.id !== projectItem.id));
    } else {
      if (res.result?.msg) {
        messageApi.error(res.result.msg);
      }
    }
  };

  // 重命名项目
  const renameProject = async () => {
    if (!renameModalInput.trim()) {
      messageApi.warning("Please enter a project name");
      return;
    }
    const res = await dashboardApi.renameProject({ id: projectItem.id, workflow_name: renameModalInput });
    if (res.success && res.result?.code === 0) {
      messageApi.success("Rename successful");
      setProjectList(projectList.map((item) => (item.id === projectItem.id ? { ...item, workflow_name: renameModalInput } : item)));
      setRenameModalOpen(false);
    } else {
      if (res.result?.msg) {
        messageApi.error(res.result.msg);
      }
    }
  };

  // 操作下拉项
  const OperateDropdownItems: MenuProps["items"] = [
    {
      key: "copy-project",
      label: (
        <div className="flex items-center justify-start gap-1 p-1 rounded text-xs font-bold leading-4 text-[#2C2C2C] hover:bg-[#F5F5F5] ">
          <Workspace_ProjectItem_Copy_Svg className="block" color="currentColor" />
          <span className="pb-[2px]">Copy Project</span>
        </div>
      ),
    },
    {
      key: "rename-project",
      label: (
        <div className="flex items-center justify-start gap-1 p-1 rounded text-xs font-bold leading-4 text-[#2C2C2C] hover:bg-[#F5F5F5] ">
          <Workspace_ProjectItem_Edit_Svg className="block" color="currentColor" />
          <span className="pb-[2px]">Rename Project</span>
        </div>
      ),
    },
    {
      key: "delete-project",
      label: (
        <div className="flex items-center justify-start gap-1 p-1 rounded text-xs font-bold leading-4 text-[#EC221F] hover:bg-[#F5F5F5] ">
          <Workspace_ProjectItem_Delete_Svg className="block" color="currentColor" />
          <span className="pb-[2px]">Delete Project</span>
        </div>
      ),
    },
  ];

  // 处理菜单点击事件
  const handleOperateDropdownClick: MenuProps["onClick"] = async ({ key }) => {
    switch (key) {
      case "copy-project":
        setCopyModalOpen(true);
        break;
      case "rename-project":
        setRenameModalInput(projectItem.workflow_name || "");
        setRenameModalOpen(true);
        break;
      case "delete-project":
        setDelModalOpen(true);
        break;
    }
  };

  return (
    <div
      className={`flex flex-col max-w-[300px] w-full rounded-[8px] bg-[#F5F5F5] overflow-hidden cursor-pointer shadow-[0px_1px_4px_0px_rgba(12,12,13,0.05),0px_1px_8px_1px_rgba(12,12,13,0.05)] hover:shadow-[0px_4px_4px_-4px_rgba(12,12,13,0.05),0px_16px_32px_-4px_rgba(12,12,13,0.10),0px_0px_4px_-1px_rgba(12,12,13,0.05)] ${style.confirmWrapper}`}
    >
      <a href={`/editor/${projectItem.id}`}>
        <div className="h-[146px] bg-gray-100 flex items-center justify-center relative rounded-t-[8px] overflow-hidden group">
          {projectItem.workflow_screen_pic ? (
            <img src={projectItem.workflow_screen_pic} loading="lazy" className="w-full h-full max-inline-full block-auto object-cover transition-all duration-300 ease-in-out group-hover:scale-110" alt="Cover Image" draggable="false" />
          ) : (
            <div className="w-full h-[146px] relative transition-all duration-300 ease-in-out group-hover:scale-110">
              <img src={coverDefault} srcSet={`${cover1x} 1x, ${cover2x} 2x, ${cover4x} 4x`} loading="lazy" className="w-full h-full max-inline-full block-auto object-cover transition-all duration-300 ease-in-out group-hover:scale-110" alt="Cover Image" draggable="false" />
            </div>
          )}
        </div>
      </a>
      <div className="pl-4 pr-[6px] flex justify-between items-center py-[6px]">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-bold leading-5 text-[#0C0C0D] truncate w-[210px]">{projectItem.workflow_name || "Unnamed Project"}</p>
          <p className="text-[9px] font-light font-normal text-[#0C0C0DD9] leading-3 line-clamp-1">Update Time · {formatDate(projectItem.update_time)}</p>
        </div>
        <Dropdown menu={{ items: OperateDropdownItems, onClick: handleOperateDropdownClick }} trigger={["click"]} classNames={{ root: "project-items-dropdown" }} popupRender={(menu) => <div style={{ minWidth: "150px" }}>{menu}</div>}>
          <div role="button" tabIndex={0} className="inline-flex items-center justify-center w-6 h-6 text-[#2C2C2C] cursor-pointer select-none">
            <Workspace_ProjectTools_Svg className="block" />
          </div>
        </Dropdown>
      </div>

      {/* 复制项目弹窗*/}
      <Modal
        open={copyModalOpen}
        wrapClassName={style.confirmWrapper}
        onCancel={() => setCopyModalOpen(false)}
        footer={null}
        title={null}
        width={526}
        centered
        destroyOnHidden
        className="copy-project-modal"
        classNames={{
          body: "copy-project-modal-content",
        }}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex flex-col items-center justify-center text-base font-bold py-6 px-[6px] gap-1 mt-6 text-[#0C0C0D]">
            <p>
              You are about to copy the project: <span className="ml-1">{projectItem.workflow_name}</span>
            </p>
            <p className="whitespace-nowrap">This action is irreversible. Are you sure you want to continue?</p>
          </div>
          <div className="flex gap-6 py-3">
            <div className="px-6 py-1.5 flex items-center justify-center text-[16px] font-semibold rounded-full border border-[#E5E7EB] bg-[#1E1E1E] text-[#FFFFFF] cursor-pointer hover:bg-[#444444] transition-colors" onClick={() => setCopyModalOpen(false)}>
              Cancel
            </div>
            <div className="px-6 py-1.5 flex items-center justify-center text-[16px] font-semibold rounded-full bg-[#35C838] text-[#FFFFFF] cursor-pointer hover:bg-[#6DEF70] transition-colors" onClick={() => copyProject()}>
              Confirm
            </div>
          </div>
        </div>
      </Modal>

      {/* 重命名项目弹窗*/}
      <Modal
        open={renameModalOpen}
        wrapClassName={style.confirmWrapper}
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
                ref={workflowNameInputRef}
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
            <div className="px-6 py-1.5 flex items-center justify-center text-[16px] font-semibold rounded-full bg-[#35C838] text-[#FFFFFF] cursor-pointer hover:bg-[#6DEF70] transition-colors" onClick={() => renameProject()}>
              Confirm
            </div>
          </div>
        </div>
      </Modal>

      {/* 删除项目弹窗*/}
      <Modal
        open={delModalOpen}
        wrapClassName={style.confirmWrapper}
        onCancel={() => setDelModalOpen(false)}
        footer={null}
        title={null}
        width={526}
        centered
        destroyOnHidden
        className="del-project-modal"
        classNames={{
          body: "del-project-modal-content",
        }}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex flex-col items-center justify-center text-base font-bold py-6 px-[6px] gap-1 mt-6 text-[#0C0C0D]">
            <p>
              You are about to delete the project: <span className="ml-1">{projectItem.workflow_name}</span>
            </p>
            <p className="whitespace-nowrap">This action is irreversible. Are you sure you want to continue?</p>
          </div>
          <div className="flex gap-6 py-3">
            <div className="px-6 py-1.5 flex items-center justify-center text-[16px] font-semibold rounded-full border border-[#E5E7EB] bg-[#1E1E1E] text-[#FFFFFF] cursor-pointer hover:bg-[#444444] transition-colors" onClick={() => setDelModalOpen(false)}>
              Cancel
            </div>
            <div className="px-6 py-1.5 flex items-center justify-center text-[16px] font-semibold rounded-full bg-[#35C838] text-[#FFFFFF] cursor-pointer hover:bg-[#6DEF70] transition-colors" onClick={() => deleteProject()}>
              Confirm
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectItem;
