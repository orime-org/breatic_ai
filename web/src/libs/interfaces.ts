export interface FeaturesExtItem {
  title: string;
  desc: string;
}

// 订阅方案列表项
export interface PlanItemType {
  cycle: string;
  description: string;
  features: string[];
  featuresExt: FeaturesExtItem[];
  icon: string;
  id: number;
  name: string;
  price: string;
  strikePrice: string;
  discount?: string;
}

// 项目列表项数据
export interface ProjectItemObj {
  id: string;
  workflow_name: string;
  create_time: string;
  update_time: string;
  workflow_screen_pic: string | null;
  workflow_icon: string | null;
  workflow_version: string;
}

// 购买生图次数
export interface CreditsItemType {
  id: number;
  name: string;
  code: string;
  icon: string | null;
  price: number;
  addonType: string;
  isFirstRecharge: boolean;
  addonValue: number;
  description: string;
}

// 用户信息
export interface UserInfoType {
  name: string;
  avatar: string;
  planId: number;
  planName: string;
  planExpiryTime: string;
  credits: number;
  email?: string;
}

// 获取充值记录参数
export interface GetRechargeRecordPayload {
  pageSize: number;
  pageNum: number;
  rechargeStatus: string;
}

// 充值记录
export interface RechargeRecordItemType {
  rechargeTime: string;
  typeDesc: string;
  totalAmount: string;
  orderNo: string;
  rechargeStatus: string;
  rechargeStatusDesc: string;
}

// 更新项目
export interface RenameProjectPayload {
  id: string;
  workflow_name: string;
}

export interface CustomerLoginBodyState {
  isAuthenticated: boolean;
  token: string;
}
export interface CustomerLoginBody {
  state: CustomerLoginBodyState;
  version: number;
}

export interface UsageRecordPayload {
  pageSize: number;
  pageNum: number;
}

export interface GetObtainedRecordPayload {
  pageSize: number;
  pageNum: number;
}

export interface UsageRecordRecentItemType {
  endTime: string;
  imgRemainingCount: number;
}

export interface CreditsRecordItemType {
  totalCredits: number;
  purchaseCredits: number;
  membershipCredits: number;
  freeCredits: number;
}

export interface UsageRecordDataItemType {
  usedToken: string;
  usedTime: string;
  typeDesc: string;
  creditsSource: string;
  quantity: number;
}

export interface ObtainedRecordDataItemType {
  obtainedTime: string;
  typeDesc: string;
  quantity: number;
}

export interface UsageRecordDataType {
  current: number;
  pages: number;
  records: UsageRecordDataItemType[];
  size: number;
  total: number;
}

export interface UsageRecordData {
  recent: UsageRecordRecentItemType[];
  data: UsageRecordDataType;
}

//stripe的逻辑
export interface CreateStripePaymentPayload {
  itemId: number;
  amount: number;
  returnUrl: string;
  cancelUrl: string;
}

export interface CaptureStripePaymentPayload {
  token: string;
}

export interface CancelStripePaymentPayload {
  token: string;
}

export interface CreateStripeSubscriptionPayload {
  planId: number;
  returnUrl: string;
  cancelUrl: string;
}

export interface VerifyStripeSubscriptionPayload {
  token: string;
}

export interface CancelStripeSubscriptionPayload {
  token: string;
}
