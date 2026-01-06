import React from "react";
import { Modal } from "antd";
import style from "./style.module.css";
import { InvalidateModal_ArrowLeft_Svg } from "@/components/Editor/SvgLoader/staticIcon";

const InvlidateModal: React.FC<{
  isShowInvalidate: boolean;
  setIsShowInvalidate: (open: boolean) => void;
}> = ({ isShowInvalidate, setIsShowInvalidate }) => {
  const backToWorkspace = () => {
    setIsShowInvalidate(false);
    // 跳转到工作区
    window.location.href = "/workspace";
  };

  const refreshPage = () => {
    setIsShowInvalidate(false);
    // 刷新页面重新加入项目
    window.location.reload();
  };

  return (
    <div className={`flex flex-col ${style.invalidateModal}`}>
      <Modal
        open={isShowInvalidate}
        closable={false}
        footer={null}
        title={null}
        width={552}
        centered
        destroyOnHidden
        className="invalidate-modal"
        classNames={{
          body: "invalidate-modal-content",
        }}
        maskClosable={false}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex flex-col items-center justify-center py-6 px-[6px] mt-6 gap-6">
            {/* 标题 */}
            <div className="text-[28px] font-medium text-[#0C0C0D] leading-9 whitespace-nowrap">Someone else is editing this project</div>

            {/* 描述文本 */}
            <div className="text-base font-bold text-[#0C0C0D] leading-6 tracking-tight justify-start">Sorry, our platform can only support one user editing the project at the same time.</div>
          </div>

          {/* 按钮组 */}
          <div className="flex gap-6 py-3 mb-[32px]">
            <button className="px-6 py-1.5 flex items-center justify-center text-[16px] font-semibold rounded-full border border-[#E5E7EB] bg-[#1E1E1E] text-[#FFFFFF] cursor-pointer hover:bg-[#444444] transition-colors" onClick={backToWorkspace}>
              <InvalidateModal_ArrowLeft_Svg className="block" color="currentColor"/>
              Back to workspace
            </button>
            <button className="px-6 py-1.5 flex items-center justify-center text-[16px] font-semibold rounded-full bg-[#35C838] text-[#FFFFFF] cursor-pointer hover:bg-[#6DEF70] transition-colors" onClick={refreshPage}>
              Rejoin the project
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InvlidateModal;
