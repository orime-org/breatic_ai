import React, { useState, useContext, useEffect, useCallback } from "react";
import { App, Dropdown, Popover, MenuProps, Modal, Tabs, Table, TableColumnsType, Segmented } from "antd";
import {
  PannelAccountComponent_Credit_Svg,
  PannelAccountComponent_AccountManagement_Svg,
  PannelAccountComponent_Discord_Svg,
  PannelAccountComponent_TermsOfUse_Svg,
  PannelAccountComponent_PrivacyPolicy_Svg,
  PannelAccountComponent_LogOut_Svg,
  UserCenterAccountTab_LogOut_Svg,
} from "../Editor/SvgLoader/staticIcon";
import avatarImg from "../../../assets/images/pages/usercenter/avatar.png";
import { IUserContexts, UserContexts } from "../../contexts/user-contexts";
import userApi from "../../api/userApi";
import pricingApi from "../../api/stripeApi";
import { CreditsRecordItemType, ObtainedRecordDataItemType, UsageRecordDataItemType, RechargeRecordItemType, PlanItemType, CreditsItemType, UserInfoType } from "../../libs/interfaces";
import authService from "../../libs/auth-service";
import style from "./style.module.css";
import { HAS_ACCOUNT_MODE } from "../../libs/global-config";
import { host } from "../../api/breaticFetch";

// 会员类型
export enum MemberType {
  MONTHLY = "MONTHLY",
  ANNUAL = "ANNUAL",
}

// 默认用户信息
const DEFAULT_USER_INFO: UserInfoType = {
  name: "User",
  email: "1234567890@mail.com",
  planName: "Free User",
  credits: 0,
  avatar: avatarImg,
  planId: 1,
  planExpiryTime: "",
};

// 用户信息
const AccountTab: React.FC = () => {
  const userContexts: IUserContexts = useContext<IUserContexts>(UserContexts);
  const [creditsRecords, setCreditsRecords] = useState<CreditsRecordItemType | null>(null);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  useEffect(() => {
    const fetchCredits = async () => {
      if (HAS_ACCOUNT_MODE && userContexts.isAuthenticated) {
        try {
          const res = await userApi.getCreditsRecord();
          if (res.success && res.result?.code === 0) {
            setCreditsRecords(res.result?.data);
          }
        } catch (error) {
          console.error("Failed to fetch credits record", error);
        }
      }
    };
    fetchCredits();
  }, [userContexts.isAuthenticated]);

  // 处理用户登出
  const handleUserLogout = async () => {
    await authService.logout();
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* User Info Card */}
      <div className="bg-[#F5F5F5] rounded-[8px] border border-[#E9E9E9] px-24 p-4 gap-3 flex items-center justify-between">
        <div className="flex items-center gap-[10px]">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#D9D9D9]">
            <img className="w-full h-full object-cover" src={userContexts.userInfo?.avatar || DEFAULT_USER_INFO.avatar} alt="Avatar" />
          </div>
          <div className="flex flex-col gap-[2px]">
            <span className="text-sm font-bold text-[#0C0C0D]">{userContexts.userInfo?.name || DEFAULT_USER_INFO.name}</span>
            <span className="text-[9px] font-light text-[#0C0C0D]">{userContexts.userInfo?.email || DEFAULT_USER_INFO.email}</span>
          </div>
        </div>
        <div className="flex items-center px-4 py-1 gap-2 text-xs font-bold leading-4 rounded-full inline-flex justify-center items-center gap-1.5 text-[#FFFFFF] bg-[#2C2C2C] hover:bg-[#444444] cursor-pointer" onClick={() => setLogoutModalOpen(true)}>
          <UserCenterAccountTab_LogOut_Svg />
          Log Out
        </div>
      </div>

      {/* Account Information Card */}
      <div className="bg-[#F5F5F5] rounded-[8px] border border-[#E9E9E9] px-24 p-4 space-y-3 flex-1 justify-between">
        <h3 className="text-xl font-bold text-[#0C0C0D] self-stretch justify-start leading-7">Account Information</h3>

        <div className="flex justify-between">
          <span className="text-sm font-bold text-[#0C0C0D] leading-5 tracking-tight">Membership Level</span>
          <div className="text-sm font-bold text-[#0C0C0D] leading-5 tracking-tight">{userContexts.userInfo?.planName || DEFAULT_USER_INFO.planName}</div>
        </div>

        <div className="text-[14px] font-normal space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-bold text-[#0C0C0D] leading-5">Credits</span>
            <div className="text-sm font-bold text-[#0C0C0D] leading-5">{creditsRecords?.totalCredits?.toLocaleString() ?? 0}</div>
          </div>

          <div className="flex justify-between">
            <span className="text-xs font-bold text-[#0C0C0D]/70 leading-4 flex gap-2 items-center">
              <div className="w-1 h-1 rounded-full bg-[#0C0C0D]/70"></div>Free Credits
            </span>
            <div className="text-xs font-bold text-[#0C0C0D]/70 leading-4">{creditsRecords?.freeCredits?.toLocaleString() ?? 0}</div>
          </div>

          <div className="flex justify-between">
            <span className="text-xs font-bold text-[#0C0C0D]/70 leading-4 flex gap-2 items-center">
              <div className="w-1 h-1 rounded-full bg-[#0C0C0D]/70"></div>Membership Credits
            </span>
            <div className="text-xs font-bold text-[#0C0C0D]/70 leading-4">{creditsRecords?.membershipCredits?.toLocaleString() ?? 0}</div>
          </div>

          <div className="flex justify-between">
            <span className="text-xs font-bold text-[#0C0C0D]/70 leading-4 flex gap-2 items-center">
              <div className="w-1 h-1 rounded-full bg-[#0C0C0D]/70"></div>Purchase Credits
            </span>
            <div className="text-xs font-bold text-[#0C0C0D]/70 leading-4">{creditsRecords?.purchaseCredits?.toLocaleString() ?? 0}</div>
          </div>
        </div>
      </div>

      {/* 登出弹窗*/}
      <Modal
        open={logoutModalOpen}
        wrapClassName={style.confirmWrapper}
        onCancel={() => setLogoutModalOpen(false)}
        footer={null}
        title={null}
        width={316}
        centered
        destroyOnHidden
        className="logout-project-modal"
        classNames={{
          body: "logout-project-modal-content",
        }}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex flex-col items-center justify-center text-base font-bold py-6 px-[6px] mt-6 text-[#0C0C0D]">
            <p className="whitespace-nowrap">Are you sure you want to sign out?</p>
          </div>
          <div className="flex gap-6 py-3">
            <div className="px-6 py-1.5 flex items-center justify-center text-[16px] font-semibold rounded-full border border-[#E5E7EB] bg-[#1E1E1E] text-[#FFFFFF] cursor-pointer hover:bg-[#444444] transition-colors" onClick={() => setLogoutModalOpen(false)}>
              Cancel
            </div>
            <div className="px-6 py-1.5 flex items-center justify-center text-[16px] font-semibold rounded-full bg-[#35C838] text-[#FFFFFF] cursor-pointer hover:bg-[#6DEF70] transition-colors" onClick={() => handleUserLogout()}>
              Confirm
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// 积分记录
const CreditsObtainedTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ObtainedRecordDataItemType[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [pageNum, setPageNum] = useState(1);
  const pageSize = 20;

  const loadData = useCallback(async (page: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await userApi.getObtainedRecordByPage({ pageNum: page, pageSize });
      if (res.success && res.result?.code === 0) {
        const records = res.result.data.records || [];
        const total = res.result.data.total || 0;
        setData((prev) => (page === 1 ? records : [...prev, ...records]));
        setHasMore(records.length === pageSize && total > page * pageSize);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(1);
  }, []);

  const columns: TableColumnsType<ObtainedRecordDataItemType> = [
    { title: "Date", dataIndex: "obtainedTime", width: "33%", align: "center", render: (text) => <span className="text-[12px] font-normal text-[#666666]">{new Date(text).toLocaleString()}</span> },
    { title: "Credit Type", dataIndex: "typeDesc", width: "33%", align: "center", render: (text) => <span className="text-[12px] font-normal text-[#666666]">{text}</span> },
    { title: "Credits Obtained", dataIndex: "quantity", width: "33%", align: "center", render: (val) => <span className="text-[12px] font-normal text-[#666666]">{`+${Number(val).toLocaleString()}`}</span> },
  ];

  return (
    <div
      className="h-[456px] overflow-auto bg-[#F5F5F5] rounded-[8px]"
      onScroll={(e) => {
        const target = e.target as HTMLDivElement;
        if (target.scrollHeight - target.scrollTop - target.clientHeight < 50 && !loading && hasMore) {
          setPageNum((prev) => {
            const nextPage = prev + 1;
            loadData(nextPage);
            return nextPage;
          });
        }
      }}
    >
      <Table
        columns={columns}
        dataSource={data}
        rowKey={(record, index) => `${record.obtainedTime}-${index}`}
        pagination={false}
        loading={loading && pageNum === 1}
        footer={data.length === 0 ? undefined : () => (!hasMore ? <div className="text-center text-[#666666] font-semibold text-[14px]">No More Data</div> : null)}
      />
    </div>
  );
};

// 积分使用记录
const CreditsUsedTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UsageRecordDataItemType[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [pageNum, setPageNum] = useState(1);
  const pageSize = 20;

  const loadData = useCallback(async (page: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await userApi.getUsageRecordByPage({ pageNum: page, pageSize });
      if (res.success && res.result?.code === 0) {
        const records = res.result.data.records || [];
        const total = res.result.data.total || 0;
        setData((prev) => (page === 1 ? records : [...prev, ...records]));
        setHasMore(records.length === pageSize && total > page * pageSize);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(1);
  }, []);

  const columns: TableColumnsType<UsageRecordDataItemType> = [
    { title: "Date", dataIndex: "usedTime", width: "20%", align: "center", render: (text) => <span className="text-[12px] font-normal text-[#666666]">{new Date(text).toLocaleString()}</span> },
    { title: "Task ID", dataIndex: "usedToken", width: "25%", align: "center", render: (text) => <span className="text-[12px] font-normal text-[#666666]">{text}</span> },
    { title: "Task Name", dataIndex: "typeDesc", width: "25%", align: "center", render: (text) => <span className="text-[12px] font-normal text-[#666666]">{text}</span> },
    { title: "Credits Type", dataIndex: "creditsSource", width: "15%", align: "center", render: (text) => <span className="text-[12px] font-normal text-[#666666]">{text}</span> },
    { title: "Credits Used", dataIndex: "quantity", width: "15%", align: "center", render: (val) => <span className="text-[12px] font-normal text-[#666666]">{`-${val}`}</span> },
  ];

  return (
    <div
      className="h-[456px] overflow-auto bg-[#F5F5F5] rounded-[8px]"
      onScroll={(e) => {
        const target = e.target as HTMLDivElement;
        if (target.scrollHeight - target.scrollTop - target.clientHeight < 50 && !loading && hasMore) {
          setPageNum((prev) => {
            const nextPage = prev + 1;
            loadData(nextPage);
            return nextPage;
          });
        }
      }}
    >
      <Table
        columns={columns}
        dataSource={data}
        rowKey={(record, index) => `${record.usedTime}-${index}`}
        pagination={false}
        loading={loading && pageNum === 1}
        footer={data.length === 0 ? undefined : () => (!hasMore ? <div className="text-center text-[#666666] font-semibold text-[14px]">No More Data</div> : null)}
      />
    </div>
  );
};

// 账单管理
const BillingTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RechargeRecordItemType[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [pageNum, setPageNum] = useState(1);
  const pageSize = 20;

  const loadData = useCallback(async (page: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await userApi.getRechargeRecordByPage({ pageNum: page, pageSize, rechargeStatus: "all" });
      if (res.success && res.result?.data) {
        const records = res.result.data.records || [];
        const total = res.result.data.total || 0;
        setData((prev) => (page === 1 ? records : [...prev, ...records]));
        setHasMore(records.length === pageSize && total > page * pageSize);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(1);
  }, []);

  const columns: TableColumnsType<RechargeRecordItemType> = [
    { title: "Date", dataIndex: "rechargeTime", width: "15%", align: "center", render: (text) => <span className="text-[12px] font-normal text-[#666666]">{new Date(text).toLocaleString()}</span> },
    { title: "Service Name", dataIndex: "typeDesc", width: "25%", align: "center", render: (text) => <span className="text-[12px] font-normal text-[#666666]">{text}</span> },
    { title: "Payment Amount", dataIndex: "totalAmount", width: "10%", align: "center", render: (val) => <span className="text-[12px] font-normal text-[#666666]">{val}</span> },
    { title: "Order Number", dataIndex: "orderNo", width: "25%", align: "center", render: (text) => <span className="text-[12px] font-normal text-[#666666]">{text}</span> },
    { title: "Order Status", dataIndex: "rechargeStatusDesc", width: "25%", align: "center", render: (text) => <span className="text-[12px] font-normal text-[#666666]">{text}</span> },
  ];

  return (
    <div
      className="h-[456px] overflow-auto bg-[#F5F5F5] rounded-[8px]"
      onScroll={(e) => {
        const target = e.target as HTMLDivElement;
        if (target.scrollHeight - target.scrollTop - target.clientHeight < 50 && !loading && hasMore) {
          setPageNum((prev) => {
            const nextPage = prev + 1;
            loadData(nextPage);
            return nextPage;
          });
        }
      }}
    >
      <Table
        columns={columns}
        dataSource={data}
        rowKey={(record, index) => `${record.orderNo}-${index}`}
        pagination={false}
        loading={loading && pageNum === 1}
        footer={data.length === 0 ? undefined : () => (!hasMore ? <div className="text-center text-[#666666] font-semibold text-[14px]">No More Data</div> : null)}
      />
    </div>
  );
};

/**
 * 升级会员 弹窗内容
 * @param param0
 * @returns
 */
const UpgradeModalContent: React.FC<{ setUpgradeModalOpen: (open: boolean) => void; setIsDataLoading: (isLoading: boolean) => void }> = ({ setUpgradeModalOpen, setIsDataLoading }) => {
  // 会员等级：月度会员、年度会员
  const [currentMemberType, setCurrentMemberType] = React.useState<MemberType>(MemberType.MONTHLY);
  // 用户上下文
  const userContexts = useContext<IUserContexts>(UserContexts);
  // 会员等级列表
  const [membershipPlanList, setMembershipPlanList] = React.useState<PlanItemType[]>([]);
  const { message: messageApi } = App.useApp();

  useEffect(() => {
    if (userContexts.isAuthenticated) {
      pricingApi.getPlanList().then((res) => {
        if (res.success && res.result?.code === 0) {
          setMembershipPlanList(res.result.data);
        }
      });
    }
  }, [userContexts.isAuthenticated]);

  // 处理订阅
  const handleSubscription = async (planId: number) => {
    setIsDataLoading(true);
    const res = await pricingApi.createSubscription({
      planId: planId,
      returnUrl: window.location.href,
      cancelUrl: window.location.href,
    });
    if (res.success && res.result?.code === 0) {
      if (res.result?.data) {
        window.location.href = res.result.data.approval_url;
      }
    } else {
      setIsDataLoading(false);
      if (res.result?.msg) {
        messageApi.error(res.result.msg);
      }
    }
  };

  return (
    <div className={`flex flex-col ${style.userCenter}`}>
      <div className="flex flex-col items-center w-full px-6 pt-6 pb-4 gap-4 overflow-y-auto">
        <div className="text-3xl font-medium leading-[30px] text-[#0C0C0D]">Upgrade Membership</div>
        <div className="text-xs font-light leading-3 text-[#0C0C0D]">Friendly Reminder: Membership privileges are non-transferable and non-refunded.</div>

        {/* Monthly/Annual 切换部分 */}
        <div className="flex items-center bg-[#D9D9D9] p-[6px] rounded-[5px] w-auto h-[40px]">
          <div
            className={`flex items-center justify-center w-[78px] h-[28px] rounded-[5px] text-xs font-bold text-center cursor-pointer transition-all ${currentMemberType === MemberType.MONTHLY ? "bg-[#434343] text-[#FFFFFF]" : "text-[#0C0C0D]"}`}
            onClick={() => setCurrentMemberType(MemberType.MONTHLY)}
          >
            Monthly
          </div>
          <div
            className={`flex items-center justify-center w-[78px] h-[28px] rounded-[5px] text-xs font-bold text-center cursor-pointer transition-all ${currentMemberType === MemberType.ANNUAL ? "bg-[#434343] text-[#FFFFFF]" : "text-[#0C0C0D]"}`}
            onClick={() => setCurrentMemberType(MemberType.ANNUAL)}
          >
            Annual
          </div>
        </div>

        <div className="flex gap-4 justify-center items-center">
          {Array.isArray(membershipPlanList) && membershipPlanList.length > 0
            ? membershipPlanList
                .filter((item) => item.cycle === currentMemberType)
                .map((planItem: PlanItemType, index: number) => (
                  <div key={`plan_item_${planItem.id}_${index}`}>
                    {/* 免费 */}
                    {index == 0 && (
                      <div className="flex-1 bg-[#F5F5F5] rounded-[8px] px-4 py-3 flex flex-col max-w-[280px] h-[400px] min-h-[400px] cursor-pointer">
                        <div className="text-xl font-bold leading-7 text-[#0C0C0D] mb-1 mt-[30px]">{planItem.name}</div>
                        <div className="text-xs font-light text-[#0C0C0D] leading-4 mb-[20px] min-h-[12px]">{planItem.description}</div>
                        <div className="flex flex-col items-center w-full">
                          <div className="flex items-baseline mb-4">
                            <span className="text-4xl font-normal text-[#0C0C0D] leading-10 tracking-normal">${planItem.price}</span>
                            <span className="text-[10px] font-normal text-[#666666]">/{currentMemberType === MemberType.MONTHLY ? "month" : "year"}</span>
                          </div>
                          <div className="px-4 py-1 flex items-center justify-center rounded-full bg-[#B3B3B3] text-xs font-bold text-[#D9D9D9] mb-[18px] transition-all cursor-pointer" onClick={() => setUpgradeModalOpen(false)}>
                            Free Trail
                          </div>
                        </div>
                        <div className="text-sm font-bold text-[#0C0C0D] mb-2">Features</div>
                        <div className="space-y-2">
                          {Array.isArray(planItem?.features) && planItem?.features.length > 0
                            ? planItem?.features.map((featureItem: string, index) => (
                                <div key={`feature_item_${index}`} className="flex items-center gap-2 text-xs font-bold text-[#0C0C0D]">
                                  <div className="flex items-center justify-center w-3 h-3">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M10 3L4.5 8.5L2 6" stroke="#52C41A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </div>
                                  {featureItem}
                                </div>
                              ))
                            : null}
                        </div>
                      </div>
                    )}

                    {/* 月会员 */}
                    {index === 1 && (
                      <div className="flex-1 outline outline-2 outline-[#199A1B] rounded-[8px] px-4 py-3 flex flex-col max-w-[280px] h-[400px] min-h-[400px] relative cursor-pointer">
                        <div className="text-xl font-bold leading-7 text-[#0C0C0D] mb-1">{planItem.name}</div>
                        <div className="text-xs font-light text-[#0C0C0D] leading-4 mb-[20px] min-h-[12px]">{planItem.description}</div>
                        <div className="flex flex-col items-center w-full">
                          <div className="flex mb-4">
                            <span className="text-4xl font-normal text-[#0C0C0D] leading-10 tracking-normal">${planItem.price}</span>
                            <div className="flex flex-col justify-end ml-1">
                              <div className="px-1.5 py-0.5 rounded-2xl inline-flex justify-center items-center text-[6px] font-normal bg-[#35C838] text-[#0C0C0D] leading-[1]">BEST VALUE</div>
                              <span className="text-[10px] font-normal text-[#666666]">/{currentMemberType === MemberType.MONTHLY ? "month" : "year"}</span>
                            </div>
                          </div>
                          <div className="px-4 py-1 flex items-center justify-center rounded-full bg-black text-white text-[12px] font-semibold mb-[18px] transition-all cursor-pointer" onClick={() => handleSubscription(planItem.id)}>
                            Upgrade Now
                          </div>
                        </div>
                        <div className="text-sm font-bold text-[#0C0C0D] mb-2">Features</div>
                        <div className="space-y-2">
                          {Array.isArray(planItem?.features) && planItem?.features.length > 0
                            ? planItem?.features.map((featureItem: string, index) => (
                                <div key={`feature_item_${index}`} className="flex items-center gap-2 text-xs font-bold text-[#0C0C0D]">
                                  <div className="flex items-center justify-center w-3 h-3">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M10 3L4.5 8.5L2 6" stroke="#52C41A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </div>
                                  {featureItem}
                                </div>
                              ))
                            : null}
                        </div>
                      </div>
                    )}

                    {/* 高级会员 */}
                    {index === 2 && (
                      <div className="flex-1 bg-[#F5F5F5] rounded-[8px] px-4 py-3 flex flex-col max-w-[280px] h-[400px] cursor-pointer">
                        <div className="text-xl font-bold leading-7 text-[#0C0C0D] mb-1">{planItem.name}</div>
                        <div className="text-xs font-light text-[#0C0C0D] leading-4 mb-[20px] min-h-[12px]">{planItem.description}</div>
                        <div className="flex flex-col items-center w-full">
                          <div className="flex items-baseline mb-4">
                            <span className="text-4xl font-normal text-[#0C0C0D] leading-10 tracking-normal">${planItem.price}</span>
                            <span className="text-[10px] font-normal text-[#666666]">/{currentMemberType === MemberType.MONTHLY ? "month" : "year"}</span>
                          </div>
                          <div className="px-4 py-1 flex items-center justify-center rounded-full bg-black text-white text-[12px] font-semibold mb-[20px] transition-all  cursor-pointer" onClick={() => handleSubscription(planItem.id)}>
                            Upgrade Now
                          </div>
                        </div>
                        <div className="text-sm font-bold text-[#0C0C0D] mb-2">Features</div>
                        <div className="space-y-2">
                          {Array.isArray(planItem?.features) && planItem?.features.length > 0
                            ? planItem?.features.map((featureItem: string, index) => (
                                <div key={`feature_item_${index}`} className="flex items-center gap-2 text-xs font-bold text-[#0C0C0D]">
                                  <div className="flex items-center justify-center w-3 h-3">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M10 3L4.5 8.5L2 6" stroke="#52C41A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </div>
                                  {featureItem}
                                </div>
                              ))
                            : null}
                        </div>
                      </div>
                    )}
                  </div>
                ))
            : null}
        </div>
      </div>
      <div className="w-full flex justify-center text-[9px] font-light text-[#0C0C0D] text-center leading-[1.5] mb-6 px-10">
        Free credits are reset at the beginning of each month. Membership credits accumulate automatically each month. Credits are used for Breatic's AI-generated images and subsequent AI generation functions for other resources.
      </div>
    </div>
  );
};

/**
 * 购买积分 弹窗内容
 * @param param0
 * @returns
 */
const PurchaseCreditsModalContent: React.FC<{ setPurchaseCreditsModalOpen: (open: boolean) => void; setIsDataLoading: (isLoading: boolean) => void }> = ({ setPurchaseCreditsModalOpen, setIsDataLoading }) => {
  // 用户上下文
  const userContexts = useContext<IUserContexts>(UserContexts);
  // 会员等级列表
  const [creditsItemList, setCreditsItemList] = React.useState<CreditsItemType[]>([]);
  const { message: messageApi } = App.useApp();

  useEffect(() => {
    if (userContexts.isAuthenticated) {
      pricingApi.getCreditsItem().then((res) => {
        if (res.success && res.result?.code === 0) {
          setCreditsItemList(res.result.data);
        }
      });
    }
  }, [userContexts.isAuthenticated]);

  /**
   * 购买积分
   * @param itemId 商品ID
   * @param price 价格
   */
  const handlePurchaseCredits = async (itemId: number, amount: number) => {
    setIsDataLoading(true);
    const res = await pricingApi.createPayment({
      itemId: itemId,
      amount: amount,
      returnUrl: window.location.href,
      cancelUrl: window.location.href,
    });
    if (res.success && res.result?.code === 0) {
      if (res.result?.data) {
        window.location.href = res.result.data.approval_url;
      }
    } else {
      setIsDataLoading(false);
      if (res.result?.msg) {
        messageApi.error(res.result.msg);
      }
    }
  };

  return (
    <div className={`flex flex-col ${style.userCenter}`}>
      <div className="flex flex-col items-center w-full p-6 gap-4 overflow-y-auto">
        <div className="text-3xl font-medium leading-[30px] text-[#0C0C0D]">Purchase Credits</div>
        <div className="text-xs font-light leading-3 text-[#0C0C0D]">Friendly Reminder: Purchase credits are non-transferable and non-refunded.</div>

        <div className="grid grid-cols-3 gap-[26px] w-full">
          {Array.isArray(creditsItemList) && creditsItemList.length > 0
            ? creditsItemList.map((item: CreditsItemType, index: number) => (
                <div key={`${item.code}-${item.id}-${index}`} className="border border-[#E9E9E9] rounded-[8px] flex flex-col items-center justify-center transition-all bg-white cursor-pointer w-[200px] h-[178px] hover:bg-[#F3F3F3]">
                  <div className="text-4xl font-bold text-[#0C0C0D] leading-10 mb-6">${item.price.toLocaleString()}</div>
                  <div className="text-sm font-bold text-[#0C0C0D] mb-4">{item.name}</div>
                  <div className="flex items-center justify-center w-[108px] h-[30px] rounded-full bg-black text-white text-xs font-bold transition-all" onClick={() => handlePurchaseCredits(item.id, Number(item.price))}>
                    Buy Now
                  </div>
                </div>
              ))
            : null}
        </div>

        <div className="text-[10px] font-light text-[#0C0C0D] text-center mt-auto max-w-[600px] leading-[1.5]">
          Free credits are reset at the beginning of each month. Membership credits accumulate automatically each month. Credits are used for Breatic's AI-generated images and subsequent AI generation functions for other resources.
        </div>
      </div>
    </div>
  );
};

// User Center Component
const UserCenter: React.FC<{ setIsDataLoading?: (isLoading: boolean) => void }> = ({ setIsDataLoading }) => {
  const { message: messageApi, modal } = App.useApp();

  // 用户上下文
  const userContexts = useContext<IUserContexts>(UserContexts);
  // 会员积分记录
  const [creditsRecords, setCreditsRecords] = useState<CreditsRecordItemType | null>(null);

  useEffect(() => {
    if (userContexts.isAuthenticated) {
      userApi.getCreditsRecord().then((res) => {
        if (res.success && res.result?.code === 0) {
          setCreditsRecords(res.result.data);
        }
      });
    }
  }, [userContexts.isAuthenticated]);

  // 下拉菜单可见状态
  const [dropdownVisible, setDropdownVisible] = useState(false);
  // 账号管理弹窗可见状态
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  // 升级弹窗可见状态
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  // 购买积分弹窗可见状态
  const [purchaseCreditsModalOpen, setPurchaseCreditsModalOpen] = useState(false);
  // 升级弹窗popover可见状态
  const [upgradePopoverVisible, setUpgradePopoverVisible] = useState(false);

  const [activeTab, setActiveTab] = useState<string>("account");

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  useEffect(() => {
    //处理前进或者后退导致的loading显示问题
    const handlePopState = (event: PopStateEvent) => {
      setIsDataLoading?.(false);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subscription_result = params.get("subscription_result");
    const credits_result = params.get("credits_result");

    // 只有在有支付回调参数时才关闭 Loading，而不是无条件关闭
    if (subscription_result || credits_result) {
      setIsDataLoading?.(false);
    }

    if (subscription_result) {
      const token = params.get("token");

      window.history.replaceState({}, "", window.location.pathname);

      if (subscription_result === "success" && token) {
        verifySubscription(token);
      } else if (subscription_result === "cancel" && token) {
        cancelSubscription(token);
      }
    } else if (credits_result) {
      const token = params.get("token");

      window.history.replaceState({}, "", window.location.pathname);

      if (credits_result === "success") {
        capturePayment(token ?? "");
      } else if (credits_result === "cancel") {
        cancelPayment(token ?? "");
      }
    }
  }, [setIsDataLoading]);

  // 确认Stripe会员订阅订单
  const verifySubscription = async (token: string) => {
    setIsDataLoading?.(true);
    const res = await pricingApi.verifySubscription({
      token: token,
    });
    setIsDataLoading?.(false);
    if (res.success && res.result?.code === 0) {
      if (res.result?.msg) {
        messageApi.success(res.result.msg);

        const data = await userApi.getUserInfo();
        if (data.result?.data) {
          userContexts.setUserInfo(data.result.data);
        }
      }
    } else {
      if (res.result?.msg) {
        messageApi.error(res.result.msg);
      }
    }
  };

  // 取消会员订阅
  const cancelSubscription = async (token: string) => {
    await pricingApi.cancelSubscription({
      token: token,
    });
    messageApi.error("Subscription cancelled!");
  };

  // 确认Stripe购买积分订单
  const capturePayment = async (token: string) => {
    setIsDataLoading?.(true);
    const res = await pricingApi.capturePayment({
      token: token,
    });
    setIsDataLoading?.(false);
    if (res.success && res.result?.code === 0) {
      if (res.result?.msg) {
        messageApi.success(res.result.msg);

        // 只有当前路径包含 usercenter 时才重新加载页面
        if (window.location.pathname.includes("usercenter")) {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          const data = await userApi.getUserInfo();
          if (data.result?.data) {
            userContexts.setUserInfo(data.result.data);
          }
        }
      }
    } else {
      if (res.result?.msg) {
        messageApi.error(res.result.msg);
      }
    }
  };

  // 取消购买会员积分
  const cancelPayment = async (token: string) => {
    await pricingApi.cancelPayment({
      token: token,
    });
    messageApi.error("Payment cancelled!");
  };

  // 会员积分悬停下拉菜单 - 内容
  const PopoverUpgradeContent = () => (
    <div className="w-72 px-6 py-4">
      <div className="flex justify-between items-center mb-6">
        <span className="text-[16px] font-bold text-[#0D0D0D]">{userContexts.userInfo?.planName || "Free User"}</span>
        <div
          className="bg-[#2C2C2C] text-white text-[12px] px-4 py-1 rounded-full cursor-pointer hover:bg-[#444444] transition-all"
          onClick={() => {
            setUpgradeModalOpen(true), setUpgradePopoverVisible(false);
          }}
        >
          Upgrade
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 cursor-pointer">
        <span className="text-[14px] font-bold text-[#0D0D0D]">Credits</span>
        <span className="text-[14px] font-bold text-[#0D0D0D]">{userContexts.userInfo?.credits?.toLocaleString()}</span>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center text-xs font-bold text-[#0C0C0D]/70">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#999999]"></div>
            Free Credits
          </div>
          <span>{creditsRecords?.freeCredits?.toLocaleString() ?? 0}</span>
        </div>
        <div className="flex justify-between items-center text-xs font-bold text-[#0C0C0D]/70">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#999999]"></div>
            Membership Credits
          </div>
          <span>{creditsRecords?.membershipCredits?.toLocaleString() ?? 0}</span>
        </div>
        <div className="flex justify-between items-center text-xs font-bold text-[#0C0C0D]/70">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#999999]"></div>
            Purchased Credits
          </div>
          <span>{creditsRecords?.purchaseCredits?.toLocaleString() ?? 0}</span>
        </div>
      </div>

      <div
        className="w-full px-6 py-1.5 leading-6 rounded-full text-[#ffffff] text-base font-bold text-center cursor-pointer bg-[#35C838] hover:bg-[#6DEF70] transition-all"
        onClick={() => {
          setPurchaseCreditsModalOpen(true), setUpgradePopoverVisible(false);
        }}
      >
        Purchase Credits
      </div>
    </div>
  );

  // 用户头像悬停下拉菜单 选项
  const UserDropdownItems: MenuProps["items"] = [
    {
      key: "user-info",
      label: (
        <div className="flex flex-col rounded-[8px] border border-[#E9E9E9] bg-[#F3F3F3] p-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center mb-6">
            <div className="w-[48px] h-[48px] rounded-full overflow-hidden">
              <img className="w-full h-full object-cover" alt="User Avatar" src={userContexts.userInfo?.avatar || DEFAULT_USER_INFO.avatar} />
            </div>
          </div>
          <div className="flex items-center justify-between mb-[10px]">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#0C0C0D] leading-tight">{userContexts.userInfo?.name || DEFAULT_USER_INFO.name}</span>
              <span className="text-[9px] font-light text-[#0C0C0D] leading-tight">{userContexts.userInfo?.email || DEFAULT_USER_INFO.email}</span>
            </div>
            <div
              className="bg-[#2C2C2C] text-white text-[12px] px-4 py-1 rounded-full cursor-pointer hover:bg-[#444444] transition-all"
              onClick={() => {
                setUpgradeModalOpen(true), setDropdownVisible(false);
              }}
            >
              Upgrade
            </div>
          </div>
        </div>
      )
    },
    {
      key: "account-management",
      label: (
        <div className="flex items-center gap-1 p-1 rounded-[4px] text-xs font-bold leading-4 text-[#0C0C0D] bg-[#FFFFFF] hover:bg-[#F3F3F3]">
          <PannelAccountComponent_AccountManagement_Svg />
          Account Management
        </div>
      ),
      style: {
        marginTop: 12
      },
    },
    {
      key: "discord",
      label: (
        <div className="flex items-center gap-1 p-1 rounded-[4px] text-xs font-bold leading-4 text-[#0C0C0D] bg-[#FFFFFF] hover:bg-[#F3F3F3]">
          <PannelAccountComponent_Discord_Svg />
          Discord
        </div>
      ),
      style: {
        marginTop: 6
      },
    },
    {
      key: "terms-of-use",
      label: (
        <div className="flex items-center gap-1 p-1 rounded-[4px] text-xs font-bold leading-4 text-[#0C0C0D] bg-[#FFFFFF] hover:bg-[#F3F3F3]">
          <PannelAccountComponent_TermsOfUse_Svg />
          Terms of Use
        </div>
      ),
      style: {
        marginTop: 6
      },
    },
    {
      key: "privacy-policy",
      label: (
        <div className="flex items-center gap-1 p-1 rounded-[4px] text-xs font-bold leading-4 text-[#0C0C0D] bg-[#FFFFFF] hover:bg-[#F3F3F3]">
          <PannelAccountComponent_PrivacyPolicy_Svg />
          Privacy Policy
        </div>
      ),
      style: {
        marginTop: 6
      },
    },
    {
      key: "log-out",
      label: (
        <div className="flex items-center gap-1 p-1 rounded-[4px] text-xs font-bold leading-4 text-[#0C0C0D] bg-[#FFFFFF] hover:bg-[#F3F3F3]">
          <PannelAccountComponent_LogOut_Svg />
          Log Out
        </div>
      ),
      style: {
        marginTop: 6
      },
    },
  ];

  // 处理菜单点击事件
  const handleMenuClick: MenuProps["onClick"] = async ({ key }) => {
    setDropdownVisible(false);

    switch (key) {
      case "account-management":
        // 跳转到账号管理页面
        setAccountModalOpen(true);
        break;
      case "discord":
        // 跳转到Discord页面
        window.open("https://discord.gg/Yeu6A4aejN", "_blank");
        break;
      case "terms-of-use":
        window.open(`${host}/terms`, "_blank");
        break;
      case "privacy-policy":
        window.open(`${host}/privacy`, "_blank");
        break;
      case "log-out":
        // 处理登出逻辑
        setLogoutModalOpen(true);
        break;
    }
  };

  // 处理用户登出
  const handleUserLogout = async () => {
    await authService.logout();
    window.location.href = "/";
  };

  // 用户管理：用户信息、积分记录、积分使用记录、账单管理
  const AccountTabsItems = [
    { value: "account", label: "Account", children: <AccountTab /> },
    { value: "credits-obtained", label: "Credits Obtained", children: <CreditsObtainedTab /> },
    { value: "credits-used", label: "Credits Used", children: <CreditsUsedTab /> },
    { value: "billing", label: "Billing", children: <BillingTab /> },
  ];

  const onSegmentedChange = (value: string) => {
    setActiveTab(value);
  };

  if (!HAS_ACCOUNT_MODE) return null;

  return (
    <div className={`bg-transparent z-20 ${style.userCenter}`}>
      <div className="relative z-30 h-full flex items-center gap-3">
        {/* 会员积分悬停下拉菜单 */}
        <Popover content={PopoverUpgradeContent} trigger="hover" placement="bottomRight" arrow={false} open={upgradePopoverVisible} onOpenChange={(open) => setUpgradePopoverVisible(open)}>
          <div className={`flex items-center h-[32px] rounded-[16px] px-3 border border-[#E9E9E9] cursor-pointer transition-all shadow-sm select-none ${upgradePopoverVisible ? "bg-[#0C0C0DB3]" : "bg-[#1E1E1E]"}`}>
            <span className={`text-sm font-bold leading-[1] tracking-[0] text-[#FFFFFF]`}>Upgrade</span>
            <div className={`w-[1px] h-[14px] bg-[#D9D9D9] mx-2`}></div>
            <div className="flex items-center gap-1">
              <div className={`w-[20px] h-[20px] flex items-center justify-center text-[#FFFFFF]`}>
                <PannelAccountComponent_Credit_Svg className="block" color="currentColor" />
              </div>
              <span className={`text-xs font-bold leading-[1] tracking-[0] text-[#FFFFFF]`}>{userContexts.userInfo?.credits?.toLocaleString() ?? 200}</span>
            </div>
          </div>
        </Popover>

        {/* 用户头像悬停下拉菜单 */}
        <div className="relative">
          <Dropdown
            menu={{
              items: UserDropdownItems,
              onClick: handleMenuClick,
            }}
            trigger={["hover"]}
            placement="bottomLeft"
            open={dropdownVisible}
            classNames={{ root: "project-logo-dropdown" }}
            popupRender={(menu) => <div style={{ minWidth: "280px", marginTop: "10px", borderRadius: "5px" }}>{menu}</div>}
            onOpenChange={(open) => setDropdownVisible(open)}
          >
            <div className="flex items-center rounded-[20px] cursor-pointer hover:bg-gray-100/10">
              <span className="relative flex shrink-0 overflow-hidden rounded-full w-[30px] h-[30px]" data-state="closed">
                <img onClick={() => {}} className="aspect-square h-full w-full" alt="Avatar" src={userContexts.userInfo?.avatar || avatarImg} />
              </span>
            </div>
          </Dropdown>
        </div>
      </div>

      {/* 用户管理：用户信息、积分记录、积分使用记录、账单管理 */}
      <Modal
        open={accountModalOpen}
        onCancel={() => setAccountModalOpen(false)}
        footer={null}
        width={900}
        centered
        destroyOnHidden
        className="account-management-modal"
        classNames={{
          body: "account-management-modal-content",
        }}
        rootClassName={style.userCenter}
      >
        <div className={`h-[580px] px-1.5 pb-6 flex flex-col items-center ${style.userCenter}`}>
          <div className="flex items-center justify-center p-[6px] rounded-[8px] mt-12 mb-3 bg-[#D9D9D9] w-auto h-[40px]">
            {AccountTabsItems.map((item, index) => {
              const w = index === 0 ? 100 : index === 1 ? 180 : index === 2 ? 120 : 80;
              return (
                <div
                  key={item.value + "_" + index}
                  className={`flex items-center justify-center h-[28px] w-[${w}px]  rounded-[5px] text-xs font-bold text-center cursor-pointer transition-all ${activeTab === item.value ? "bg-[#434343] text-[#FFFFFF]" : "text-[#0C0C0D]"}`}
                  onClick={() => onSegmentedChange(item.value)}
                >
                  {item.label}
                </div>
              );
            })}
          </div>
          <div className="flex-1 flex flex-col w-[800px] h-[480px]">{AccountTabsItems.filter((item) => item.value === activeTab)[0]?.children}</div>
        </div>
      </Modal>

      {/* Modal 升级会员*/}
      <Modal
        open={upgradeModalOpen}
        onCancel={() => setUpgradeModalOpen(false)}
        footer={null}
        title={null}
        width={978}
        centered
        destroyOnHidden
        className="upgrade-relationship-modal"
        classNames={{
          body: "upgrade-relationship-modal-content",
        }}
        rootClassName={style.userCenter}
      >
        <UpgradeModalContent setUpgradeModalOpen={setUpgradeModalOpen} setIsDataLoading={setIsDataLoading || (() => {})} />
      </Modal>

      {/* Modal - 购买积分 */}
      <Modal
        open={purchaseCreditsModalOpen}
        onCancel={() => setPurchaseCreditsModalOpen(false)}
        footer={null}
        width={706}
        centered
        destroyOnHidden
        className="upgrade-relationship-modal"
        classNames={{
          body: "upgrade-relationship-modal-content",
        }}
        rootClassName={style.userCenter}
      >
        <PurchaseCreditsModalContent setPurchaseCreditsModalOpen={setPurchaseCreditsModalOpen} setIsDataLoading={setIsDataLoading || (() => {})} />
      </Modal>

      {/* 登出弹窗*/}
      <Modal
        open={logoutModalOpen}
        wrapClassName={style.confirmWrapper}
        onCancel={() => setLogoutModalOpen(false)}
        footer={null}
        title={null}
        width={316}
        centered
        destroyOnHidden
        className="logout-project-modal"
        classNames={{
          body: "logout-project-modal-content",
        }}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex flex-col items-center justify-center text-base font-bold py-6 px-[6px] mt-6 text-[#0C0C0D]">
            <p className="whitespace-nowrap">Are you sure you want to sign out?</p>
          </div>
          <div className="flex gap-6 py-3">
            <div className="px-6 py-1.5 flex items-center justify-center text-[16px] font-semibold rounded-full border border-[#E5E7EB] bg-[#1E1E1E] text-[#FFFFFF] cursor-pointer hover:bg-[#444444] transition-colors" onClick={() => setLogoutModalOpen(false)}>
              Cancel
            </div>
            <div className="px-6 py-1.5 flex items-center justify-center text-[16px] font-semibold rounded-full bg-[#35C838] text-[#FFFFFF] cursor-pointer hover:bg-[#6DEF70] transition-colors" onClick={() => handleUserLogout()}>
              Confirm
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserCenter;
