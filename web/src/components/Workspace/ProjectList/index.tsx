/**
 * 项目列表
 */
import { App, Button, Modal, Input } from "antd";
import type { InputRef } from "antd";
import React, { useEffect, useRef, useState, useContext } from "react";
import ProjectItem from "../ProjectItem";
import dashboardApi from "../../../api/workflowApi";
import { IUserContexts, UserContexts } from "./../../../contexts/user-contexts";
import { ProjectItemObj } from "./../../../libs/interfaces";
import editorApi from "../../../api/editorApi";
import style from "./style.module.css";
import { WorkspaceContexts } from "../../../contexts/workspace-contexts";
import { Workspace_ProjectPlus_Svg } from "@/components/Editor/SvgLoader/staticIcon";

import notLogin1x from "@/assets/images/pages/workspace/Illustration=not login-1.png";
import notLogin2x from "@/assets/images/pages/workspace/Illustration=not login@2x.png";
import notLogin4x from "@/assets/images/pages/workspace/Illustration=not login@4x.png";
import notLoginDefault from "@/assets/images/pages/workspace/Illustration=not login.png";

const ProjectList: React.FC = () => {
  const { message: messageApi } = App.useApp();

  const PAGE_SIZE = 20;
  const userContexts: IUserContexts = useContext<IUserContexts>(UserContexts);
  const [projectList, setProjectList] = useState<ProjectItemObj[]>([]);
  const pageNum = useRef<number>(1);

  const [newWorkflowModalOpen, setNewWorkflowModalOpen] = useState(false);
  const [workflowNameInput, setWorkflowNameInput] = useState("");
  const workflowNameInputRef = useRef<InputRef>(null);

  const { setIsWorkspaceDataLoading } = useContext(WorkspaceContexts);

  // 分页获取项目列表
  const getProjectListByPage = async () => {
    setIsWorkspaceDataLoading(true);
    const res = await dashboardApi.getProjectListByPage(pageNum.current, PAGE_SIZE);
    if (!res.success || !res.result?.data?.records) {
      // 重置Loading 动画
      setIsWorkspaceDataLoading(false);
      return;
    }

    const newRecords = Array.isArray(res.result.data.records) ? res.result.data.records : [];
    setProjectList((prevList) => [...prevList, ...newRecords]);

    // 重置Loading 动画
    setIsWorkspaceDataLoading(false);
  };

  // 获取项目列表
  useEffect(() => {
    (async () => {
      if (userContexts.isAuthenticated) {
        await getProjectListByPage();
      }
    })();
  }, [userContexts.isAuthenticated]);

  useEffect(() => {
    if (newWorkflowModalOpen) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          workflowNameInputRef.current?.focus();
        });
      });
    }
  }, [newWorkflowModalOpen]);

  // 创建工作流
  const handleCreateWorkflowClickEvent = async () => {
    if (!workflowNameInput) {
      messageApi.warning("Project name cannot be empty");
      return;
    }

    setNewWorkflowModalOpen(false);
    setWorkflowNameInput("");

    const res = await editorApi.createWorkflow({
      workflow_name: workflowNameInput,
    });
    if (res.success && res.result?.code === 0 && res.result?.data) {
      const data = res.result.data;
      const workflowId = data.id;

      if (!workflowId) {
        return;
      }

      // 跳转到编辑器页并携带参数
      window.location.href = `/editor/${String(workflowId)}`;
    } else {
      messageApi.error(res.result?.msg || "Failed to create workflow");
    }
  };

  return (
    <div className="mx-auto pt-2 pb-6 max-w-full min-[1224px]:max-w-[1260px] min-[1660px]:max-w-[1128px]">
      <div className="grid justify-items-center grid-cols-[repeat(auto-fill,minmax(242px,1fr))] gap-6">
        {/* 创建项目按钮 */}
        {userContexts.isAuthenticated ? (
          <div
            className="
                h-[190px] max-w-[300px] w-full
                bg-[#FFFFFF] hover:bg-[#F5F5F5]
                outline outline-1 hover:outline-2
                outline-offset-[-1px] hover:outline-offset-[-2px]
                outline-[#35C838]
                rounded-lg
                shadow-[0px_1px_4px_0px_rgba(12,12,13,0.05),0px_1px_8px_1px_rgba(12,12,13,0.05)]
                hover:shadow-[0px_4px_4px_-4px_rgba(12,12,13,0.05),0px_16px_32px_-4px_rgba(12,12,13,0.10),0px_0px_4px_-1px_rgba(12,12,13,0.05)]
                flex flex-col items-center justify-center
                cursor-pointer
                transition-colors
              "
            onClick={() => setNewWorkflowModalOpen(true)}
          >
            <div className="w-[38px] h-[38px] flex items-center justify-center mb-3">
              <Workspace_ProjectPlus_Svg className="block" color="#35C838" />
            </div>
            <span className="text-[#0C0C0D] text-sm font-bold leading-5">Create New Project</span>
          </div>
        ) : null}

        {userContexts.isAuthenticated ? null : (
          // 登录按钮
          <div className="flex flex-col flex-nowrap items-center justify-center col-span-full cursor-pointer gap-6 mt-24">
            <img src={notLoginDefault} alt="laptop_work" srcSet={`${notLogin1x} 1x, ${notLogin2x} 2x, ${notLogin4x} 4x`} loading="lazy" className="w-[222px] h-[222px] max-inline-full block-auto object-cover transition-all duration-300 ease-in-out group-hover:scale-110" draggable="false" />
            <div className="flex flex-col gap-[6px] text-center">
              <div className="text-4xl font-normal text-[#0C0C0D]">Not Logged In</div>
              <div className="text-base font-light text-[#0C0C0D]">Log in to experience all product features</div>
            </div>
            <div className="text-base font-bold px-6 py-1.5 rounded-full inline-flex justify-center items-center gap-2.5 text-[#FFFFFF] bg-[#35C838] hover:bg-[#6DEF70]" onClick={() => window.location.assign("/login?from=workspace&target=workspace")}>
              Log In Now
            </div>
          </div>
        )}

        {/* 项目列表 */}
        {userContexts.isAuthenticated && Array.isArray(projectList) && projectList.length > 0 ? projectList.map((item: ProjectItemObj, index: number) => <ProjectItem key={`project_item_${item.id}_${index}`} projectItem={item} projectList={projectList} setProjectList={setProjectList} />) : null}
      </div>

      <Modal
        open={newWorkflowModalOpen}
        wrapClassName={style.confirmWrapper}
        onCancel={() => setNewWorkflowModalOpen(false)}
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
                value={workflowNameInput}
                onChange={(e) => setWorkflowNameInput(e.target.value)}
                placeholder="Please enter the text hear"
                className="flex w-[380px] h-[24px] bg-[#F5F5F5] text-[#0C0C0D] !border-0 !outline-0 items-center justify-center"
                suffix={null}
                maxLength={128}
              />
            </div>
          </div>
          <div className="flex gap-6 py-3">
            <div className="px-6 py-1.5 flex items-center justify-center text-[16px] font-semibold rounded-full border border-[#E5E7EB] bg-[#1E1E1E] text-[#FFFFFF] cursor-pointer hover:bg-[#444444] transition-colors" onClick={() => setNewWorkflowModalOpen(false)}>
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

export default ProjectList;
