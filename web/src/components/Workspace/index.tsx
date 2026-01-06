/**
 * 工作台页面
 */
import { Button, Layout, Spin, Tooltip } from "antd";
import { useContext, useEffect, useState } from "react";
import authService from "../../libs/auth-service";

import { IUserContexts, UserContexts } from "./../../contexts/user-contexts";
import { WorkspaceContexts } from "../../contexts/workspace-contexts";
import style from "./style.module.css";
import React from "react";
import { WorkspaceHomeLogo_Svg, Workspace_Discord_Svg, Workspace_Instagram_Svg, Workspace_TwitterOrX_Svg, Workspace_Youtube_Svg } from "../Editor/SvgLoader/staticIcon";
import { ThinScrollbar } from "@/components/Editor/Components/SceneEditor/VideoEditor/utils/Scrollbar";

import ProjectList from "./ProjectList";
import UserCenter from "../UserCenter";

const { Sider, Content } = Layout;

const Workspace: React.FC = () => {
  const currentYear = new Date().getFullYear();

  // 用户信息
  const userContexts: IUserContexts = React.useContext<IUserContexts>(UserContexts);

  const { setIsWorkspaceDataLoading } = useContext(WorkspaceContexts);

  // useEffect(() => {
  //   authService.registerLogoutCallback(() => {
  //     userContexts.setIsAuthenticated(false);
  //     userContexts.setUserInfo(undefined);
  //   });
  // }, [userContexts]);

  return (
    <div className={"w-full min-h-screen flex flex-col relative"}>
      <Layout className={`h-screen overflow-hidden ${style.workspaceWrapper}`}>
        <Sider
          theme="light"
          trigger={null}
          collapsible
          collapsed={true}
          collapsedWidth={56}
          className="bg-background"
          width={56}
          style={{
            width: 56,
            maxWidth: 56,
            minWidth: 56,
            borderRight: "none",
            height: "100%",
          }}
        >
          <div className="flex flex-col h-full items-center justify-between px-4 py-4">
            <Tooltip title="Home" placement="right">
              <div
                onClick={() => {
                  window.open("/", "_blank");
                }}
                className="flex items-center justify-center w-6 h-6 cursor-pointer w-full text-[#35C838] hover:text-[#6DEF70]"
              >
                <WorkspaceHomeLogo_Svg className="block" color="currentColor" />
              </div>
            </Tooltip>

            <div aria-hidden="true" style={{ display: "none" }}></div>
            <div className="space-y-6 mt-4 flex flex-col items-center">
              <div className="flex gap-5 flex-col">
                <div className="h-[1px] w-full bg-[#D9D9D9]"></div>
                <div onClick={() => window.open("https://discord.gg/Yeu6A4aejN", "_blank")} className="flex items-center justify-center w-[18px] h-[18px] cursor-pointer w-full text-[#2C2C2C] hover:text-[#35C838]">
                  <Workspace_Discord_Svg className="block" color="currentColor" />
                </div>
                <div onClick={() => window.open("https://x.com/breatic_ai", "_blank")} className="flex items-center justify-center w-[18px] h-[18px] cursor-pointer w-full text-[#2C2C2C] hover:text-[#35C838]">
                  <Workspace_TwitterOrX_Svg className="block" color="currentColor" />
                </div>
                <div onClick={() => window.open("https://www.youtube.com/@breatic_ai", "_blank")} className="flex items-center justify-center w-[18px] h-[18px] cursor-pointer w-full text-[#2C2C2C] hover:text-[#35C838]">
                  <Workspace_Youtube_Svg className="block" color="currentColor" />
                </div>
                <div onClick={() => window.open("https://www.instagram.com/breatic_ai/", "_blank")} className="flex items-center justify-center w-[18px] h-[18px] cursor-pointer w-full text-[#2C2C2C] hover:text-[#35C838]">
                  <Workspace_Instagram_Svg className="block" color="currentColor" />
                </div>
              </div>
            </div>
          </div>
        </Sider>
        <Layout className="min-h-screen bg-white">
          <Content>
            <div className="flex flex-col h-full">
              <div className="relative h-14 w-full flex flex-row justify-center items-center">
                <div className="absolute right-14">{userContexts.isAuthenticated ? <UserCenter setIsDataLoading={setIsWorkspaceDataLoading} /> : null}</div>
              </div>
              <div className="flex-1 flex flex-col px-[50px]">
                {userContexts.isAuthenticated ? <div className="mb-6 text-4xl font-medium leading-10">Recent Projects</div> : null}
                <ThinScrollbar>
                  <ProjectList />
                </ThinScrollbar>
                <div className="mx-auto py-2 flex flex-wrap flex-row justify-center mt-auto">
                  <p className="text-neutral-400 text-xs text-center">© {currentYear} Orime. All Rights Reserved.</p>
                </div>
              </div>
            </div>
          </Content>
        </Layout>
      </Layout>
    </div>
  );
};

export default Workspace;
