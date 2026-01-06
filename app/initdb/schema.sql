-- 1) schema（一般已存在，谨慎执行）
CREATE SCHEMA IF NOT EXISTS public;

DROP TABLE IF EXISTS public.node_template;

CREATE TABLE public.node_template (
    id varchar NOT NULL,
    template_name varchar NULL,
    group_type varchar NULL,
    group_type_code int NULL,
    group_type_sort_level int NULL,
    language_code varchar NULL,
    group_type_icon varchar NULL,
    template_code int NULL,
    template_icon varchar NULL,
    sort_level int NULL,
    content jsonb NULL,
    remark varchar NULL,
    create_time timestamptz DEFAULT now(),
    create_by varchar NULL,
    is_delete int DEFAULT 0,
    CONSTRAINT node_template_pk PRIMARY KEY (id)
);

COMMENT ON TABLE public.node_template IS '节点模板表';
COMMENT ON COLUMN public.node_template.id IS '主键';
COMMENT ON COLUMN public.node_template.template_name IS '模板名称';
COMMENT ON COLUMN public.node_template.group_type IS '模板类型';
COMMENT ON COLUMN public.node_template.group_type_code IS '模板类型编码';
COMMENT ON COLUMN public.node_template.group_type_sort_level IS '模板类型排序等级';
COMMENT ON COLUMN public.node_template.language_code IS '语言编码';
COMMENT ON COLUMN public.node_template.template_icon IS '模版图标';
COMMENT ON COLUMN public.node_template.sort_level IS '等级（用于前端显示顺序）';
COMMENT ON COLUMN public.node_template.content IS '模板内容';
COMMENT ON COLUMN public.node_template.remark IS '备注';
COMMENT ON COLUMN public.node_template.create_time IS '创建时间';
COMMENT ON COLUMN public.node_template.create_by IS '创建人';
COMMENT ON COLUMN public.node_template.is_delete IS '是否删除（0：未删除，1：已删除）';

DROP TABLE IF EXISTS public.workflow;

CREATE TABLE public.workflow (
    id VARCHAR NOT NULL,
    user_id VARCHAR NULL,
    workflow_name VARCHAR NULL,
    workflow_icon VARCHAR NULL,
    workflow_screen_pic VARCHAR NULL,
    workflow_version VARCHAR NULL,
    content jsonb NULL,
    remark VARCHAR NULL,
     
    create_time timestamptz DEFAULT now(),
    update_time timestamptz NULL,
    create_by varchar NULL,
    is_delete int DEFAULT 0,
    CONSTRAINT workflow_pk PRIMARY KEY (id)
);

COMMENT ON TABLE public.workflow IS '用户工作流表，每个工作流由多个节点组成';
COMMENT ON COLUMN public.workflow.id IS '主键';
COMMENT ON COLUMN public.workflow.user_id IS '用户id';
COMMENT ON COLUMN public.workflow.workflow_name IS '工作流名称';
COMMENT ON COLUMN public.workflow.workflow_icon IS '工作流图标';
COMMENT ON COLUMN public.workflow.workflow_version IS '当前工作流版本';
COMMENT ON COLUMN public.workflow.content IS '工作流内容';
COMMENT ON COLUMN public.workflow.remark IS '备注';
COMMENT ON COLUMN public.workflow.create_time IS '创建时间';
COMMENT ON COLUMN public.workflow.create_by IS '创建人';
COMMENT ON COLUMN public.workflow.is_delete IS '是否删除（0：未删除，1：已删除）';

CREATE INDEX idx_workflow_user_id ON public.workflow(user_id);

DROP TABLE IF EXISTS public.workflow_node_exec;

CREATE TABLE public.workflow_node_exec (
    id VARCHAR NOT NULL,
    user_id VARCHAR NULL,
    node_id VARCHAR NULL,
    workflow_id VARCHAR NULL,
    node_content jsonb NULL,
    exec_result jsonb NULL,
    exec_time int NULL,
    create_time timestamptz DEFAULT now(),
    update_time timestamptz DEFAULT now(),
    template_node_code int NULL,
    create_by varchar NULL,
    CONSTRAINT workflow_node_exec_pk PRIMARY KEY (id)
);

COMMENT ON TABLE public.workflow_node_exec IS '当前节点执行结果表';
COMMENT ON COLUMN public.workflow_node_exec.id IS '主键';
COMMENT ON COLUMN public.workflow_node_exec.user_id IS '用户id';
COMMENT ON COLUMN public.workflow_node_exec.node_id IS '节点id';
COMMENT ON COLUMN public.workflow_node_exec.workflow_id IS '工作流id';
COMMENT ON COLUMN public.workflow_node_exec.node_content IS '节点内容';
COMMENT ON COLUMN public.workflow_node_exec.exec_result IS '执行结果';
COMMENT ON COLUMN public.workflow_node_exec.exec_time IS '执行时间';
COMMENT ON COLUMN public.workflow_node_exec.create_time IS '创建时间';
COMMENT ON COLUMN public.workflow_node_exec.update_time IS '更新时间';
COMMENT ON COLUMN public.workflow_node_exec.template_node_code IS '模板节点code';
COMMENT ON COLUMN public.workflow_node_exec.create_by IS '创建人';


CREATE INDEX idx_workflow_node_exec_user_id ON public.workflow_node_exec(user_id);
CREATE INDEX idx_workflow_node_exec_node_id ON public.workflow_node_exec(node_id);
CREATE INDEX idx_workflow_node_exec_workflow_id ON public.workflow_node_exec(workflow_id);


-- Drop table if exists
DROP TABLE IF EXISTS public.accounts;

CREATE TABLE public.accounts (
    id VARCHAR PRIMARY KEY,                     -- 替代 ObjectID
    email VARCHAR(255) NOT NULL,                 -- 邮箱
    status VARCHAR(32) DEFAULT 'active',         -- active / inactive
    account_type VARCHAR(32) NOT NULL,           -- email / google / github / tiktok
    user_id VARCHAR(64) NOT NULL,                -- 用户ID
    verification_code VARCHAR(64),               -- 验证码
    verify_token VARCHAR(64),                    -- 验证token
    code_created_at TIMESTAMPTZ,                 -- 验证码创建时间
    code_expires_at TIMESTAMPTZ,                 -- 验证码过期时间
    last_updated_at TIMESTAMPTZ DEFAULT now(),   -- 最近更新时间
    created_at TIMESTAMPTZ DEFAULT now(),        -- 创建时间
    created_at_str VARCHAR(32)                   -- 创建时间字符串
);

COMMENT ON TABLE public.accounts IS '账号表';
COMMENT ON COLUMN public.accounts.id IS '主键';
COMMENT ON COLUMN public.accounts.email IS '邮箱';
COMMENT ON COLUMN public.accounts.status IS '状态（active / inactive）';
COMMENT ON COLUMN public.accounts.account_type IS '账号类型：email / google / github / tiktok';
COMMENT ON COLUMN public.accounts.user_id IS '用户ID';
COMMENT ON COLUMN public.accounts.verification_code IS '验证码';
COMMENT ON COLUMN public.accounts.verify_token IS '验证token';
COMMENT ON COLUMN public.accounts.code_created_at IS '验证码创建时间';
COMMENT ON COLUMN public.accounts.code_expires_at IS '验证码过期时间';
COMMENT ON COLUMN public.accounts.last_updated_at IS '最后更新时间';
COMMENT ON COLUMN public.accounts.created_at IS '创建时间';
COMMENT ON COLUMN public.accounts.created_at_str IS '创建时间字符串';


-- 表：public.snapshot_template
CREATE TABLE IF NOT EXISTS public.snapshot_template (
    id                     VARCHAR PRIMARY KEY,
    node_template_id       VARCHAR NULL,
    user_id                VARCHAR NULL,
    workflow_id            VARCHAR NULL,
    node_id                VARCHAR   NULL,
    snapshot_template_name VARCHAR   NULL,
    snapshot_screen_pic    VARCHAR   NULL,
    remark                 VARCHAR   NULL,
    create_time            TIMESTAMPTZ NULL DEFAULT NOW(),
    create_by              VARCHAR   NULL,
    is_delete              int DEFAULT 0
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_snapshot_template_workflow
    ON public.snapshot_template (workflow_id);

CREATE INDEX IF NOT EXISTS idx_snapshot_template_node_tpl
    ON public.snapshot_template (node_template_id);

-- 表注释
COMMENT ON TABLE public.snapshot_template IS '快照模版表';

-- 列注释
COMMENT ON COLUMN public.snapshot_template.id IS '主键';
COMMENT ON COLUMN public.snapshot_template.node_template_id IS '节点模板id';
COMMENT ON COLUMN public.snapshot_template.user_id IS '用户id';
COMMENT ON COLUMN public.snapshot_template.workflow_id IS '工作流id';
COMMENT ON COLUMN public.snapshot_template.node_id IS '节点id';
COMMENT ON COLUMN public.snapshot_template.snapshot_template_name IS '快照模版名称';
COMMENT ON COLUMN public.snapshot_template.snapshot_screen_pic IS '快照模版缩略图';
COMMENT ON COLUMN public.snapshot_template.remark IS '备注';
COMMENT ON COLUMN public.snapshot_template.create_time IS '创建时间';
COMMENT ON COLUMN public.snapshot_template.create_by IS '创建人';
COMMENT ON COLUMN public.snapshot_template.is_delete IS '是否删除（0 ：未删除，1：已删除）';

-- 表：public.snapshot_template_node
CREATE TABLE IF NOT EXISTS public.snapshot_template_node (
    id                   VARCHAR PRIMARY KEY,
    snapshot_template_id VARCHAR NULL,
    content              JSONB NULL,
    create_time          TIMESTAMPTZ NULL DEFAULT NOW(),
    create_by            VARCHAR NULL
);

-- 索引：按 snapshot_template_id
CREATE INDEX IF NOT EXISTS snapshot_template_node_snapshot_template_id
    ON public.snapshot_template_node (snapshot_template_id);

-- 表注释
COMMENT ON TABLE public.snapshot_template_node IS '快照模版节点表';

-- 列注释
COMMENT ON COLUMN public.snapshot_template_node.id IS '主键';
COMMENT ON COLUMN public.snapshot_template_node.snapshot_template_id IS '节点模板id';
COMMENT ON COLUMN public.snapshot_template_node.content IS '快照内容';
COMMENT ON COLUMN public.snapshot_template_node.create_time IS '创建时间';
COMMENT ON COLUMN public.snapshot_template_node.create_by IS '创建人';


-- Drop table if exists
DROP TABLE IF EXISTS public.users;

CREATE TABLE public.users (
    id varchar PRIMARY KEY,                           -- 替代 ObjectID
    nickname VARCHAR(64),                            -- 昵称
    avatar VARCHAR(512),                             -- 头像URL
    subscription_id VARCHAR(128),                    -- PayPal/Stripe 订阅ID
    free_credits INT DEFAULT 400,                    -- 免费积分
    membership_credits INT DEFAULT 0,                -- 会员积分
    purchase_credits INT DEFAULT 0,                  -- 购买积分
    project_count_limit INT DEFAULT 10,              -- 项目数量上限
    membership_created_at TIMESTAMPTZ,               -- 会员开始时间
    membership_expires_at TIMESTAMPTZ,               -- 会员结束时间
    membership_level INT DEFAULT 0,                  -- 会员等级（planId）
    membership_next_month_update_at TIMESTAMPTZ,     -- 会员积分下次更新时间
    free_next_month_update_at TIMESTAMPTZ,           -- 免费积分下次更新时间
    is_first_recharge BOOLEAN DEFAULT TRUE,          -- 是否首次充值
    last_login_at TIMESTAMPTZ,                       -- 最后登录时间
    last_updated_at TIMESTAMPTZ DEFAULT now(),       -- 最近更新时间
    created_at TIMESTAMPTZ DEFAULT now(),            -- 创建时间
    created_at_str VARCHAR(32)                       -- 创建时间字符串
);

COMMENT ON TABLE public.users IS '用户表';
COMMENT ON COLUMN public.users.id IS '主键';
COMMENT ON COLUMN public.users.nickname IS '昵称';
COMMENT ON COLUMN public.users.avatar IS '头像地址';
COMMENT ON COLUMN public.users.subscription_id IS 'Stripe/PayPal 订阅ID';
COMMENT ON COLUMN public.users.free_credits IS '免费积分，每月重置';
COMMENT ON COLUMN public.users.membership_credits IS '会员积分，每月重置';
COMMENT ON COLUMN public.users.purchase_credits IS '购买积分，永久有效';
COMMENT ON COLUMN public.users.project_count_limit IS '项目数量限制';
COMMENT ON COLUMN public.users.membership_created_at IS '会员购买时间';
COMMENT ON COLUMN public.users.membership_expires_at IS '会员到期时间';
COMMENT ON COLUMN public.users.membership_level IS '会员等级，从0开始';
COMMENT ON COLUMN public.users.membership_next_month_update_at IS '会员积分下次更新';
COMMENT ON COLUMN public.users.free_next_month_update_at IS '免费积分下次更新';
COMMENT ON COLUMN public.users.is_first_recharge IS '是否首次充值';
COMMENT ON COLUMN public.users.last_login_at IS '最后登录时间';
COMMENT ON COLUMN public.users.last_updated_at IS '最近更新时间';
COMMENT ON COLUMN public.users.created_at IS '创建时间';
COMMENT ON COLUMN public.users.created_at_str IS '创建时间字符串';



-- 积分使用流水表
CREATE TABLE IF NOT EXISTS public.credits_used_history (
    id                 VARCHAR PRIMARY KEY,
    user_id            VARCHAR        NOT NULL,             -- 用户ID
    credits_type       VARCHAR        NOT NULL,             -- 积分类型
    used_credits       INT            NOT NULL,             -- 使用积分
    used_channel       VARCHAR        NOT NULL,             -- 使用渠道
    used_type          VARCHAR        NOT NULL,             -- 使用类型
    used_time          TIMESTAMPTZ    NOT NULL DEFAULT now(), -- 使用时间（默认当前）
    used_token         VARCHAR        NULL,                   -- 幂等令牌
    create_time        TIMESTAMPTZ    NOT NULL DEFAULT now()  -- 创建时间（默认当前）
);

-- 常用查询索引
CREATE INDEX IF NOT EXISTS ix_credits_usage_user_time
    ON public.credits_used_history (user_id, used_time DESC);

CREATE INDEX IF NOT EXISTS ix_credits_usage_used_token
    ON public.credits_used_history (used_token);

-- 注释（方便文档化与数据字典）
COMMENT ON TABLE  public.credits_used_history IS '积分使用流水表';
COMMENT ON COLUMN public.credits_used_history.id                IS '主键（雪花ID等外部生成）';
COMMENT ON COLUMN public.credits_used_history.user_id           IS '用户id';
COMMENT ON COLUMN public.credits_used_history.credits_type      IS '积分类型';
COMMENT ON COLUMN public.credits_used_history.used_credits      IS '使用积分（>0）';
COMMENT ON COLUMN public.credits_used_history.used_channel      IS '使用渠道';
COMMENT ON COLUMN public.credits_used_history.used_type         IS '使用类型';
COMMENT ON COLUMN public.credits_used_history.used_time         IS '使用时间（timestamptz）';
COMMENT ON COLUMN public.credits_used_history.used_token        IS '幂等令牌（user_id+used_token 唯一，NULL 不参与约束）';
COMMENT ON COLUMN public.credits_used_history.create_time       IS '创建时间（timestamptz）';



-- 积分获得记录表
CREATE TABLE IF NOT EXISTS public.credits_obtained_history (
    id                   varchar       PRIMARY KEY,             -- 主键（可用雪花ID等外部生成）
    user_id              VARCHAR      NOT NULL,                -- 用户id
    credits_type         VARCHAR      NOT NULL,                -- 积分类型
    obtained_credits     INT          NOT NULL,                -- 获得积分
    recharge_history_id  VARCHAR      NULL,                    -- 充值记录id（若来源于充值；其他来源可为空）
    obtained_time        TIMESTAMPTZ  NOT NULL DEFAULT now(),  -- 获得/充值时间
    create_time          TIMESTAMPTZ  NOT NULL DEFAULT now()   -- 创建时间

);

-- 常用查询索引
CREATE INDEX IF NOT EXISTS ix_credits_obtained_user_time
    ON public.credits_obtained_history (user_id, obtained_time DESC);

CREATE INDEX IF NOT EXISTS ix_credits_obtained_recharge
    ON public.credits_obtained_history (recharge_history_id);


-- 注释：便于数据字典/文档化
COMMENT ON TABLE  public.credits_obtained_history IS '积分获得记录表';
COMMENT ON COLUMN public.credits_obtained_history.id                  IS '主键';
COMMENT ON COLUMN public.credits_obtained_history.user_id             IS '用户id';
COMMENT ON COLUMN public.credits_obtained_history.credits_type        IS '积分类型';
COMMENT ON COLUMN public.credits_obtained_history.obtained_credits    IS '获得积分（>0）';
COMMENT ON COLUMN public.credits_obtained_history.recharge_history_id IS '充值记录id（若来源于充值）';
COMMENT ON COLUMN public.credits_obtained_history.obtained_time       IS '获得/充值时间（timestamptz）';
COMMENT ON COLUMN public.credits_obtained_history.create_time         IS '创建时间（timestamptz）';

-- 充值记录表
CREATE TABLE IF NOT EXISTS public.recharge_history (
    id                varchar        PRIMARY KEY,                -- 主键（外部生成/雪花ID）
    user_id           VARCHAR       NOT NULL,                    -- 用户id
    recharge_type     VARCHAR       NOT NULL,                    -- 交易类型（如 purchase_credits/membership_subscription/...）
    recharge_amount   NUMERIC(12,2)        NOT NULL,             -- 交易金额（两位小数）
    recharge_channel  VARCHAR       NOT NULL,                    -- 支付渠道（如 paypal/stripe/...）
    recharge_time     TIMESTAMPTZ   NOT NULL DEFAULT now(),      -- 交易时间
    recharge_status   VARCHAR       NOT NULL,                    -- 交易状态（如 created/succeeded/failed/refunded）
    recharge_item_id  VARCHAR       NULL,                        -- 关联套餐
    recharge_remote_id VARCHAR       NULL,                        -- 远程支付id
    recharge_token    VARCHAR       NULL,                        -- 幂等令牌
    recharge_membership_level INT   NULL,                        -- 充值套餐等级
    recharge_credits  INT   NULL,                                -- 充值积分
    recharge_extra    jsonb NULL,                                -- 充值额外信息（如 stripe 支付id）
    remark            VARCHAR       NULL,                        -- 备注
    create_time       TIMESTAMPTZ   NOT NULL DEFAULT now(),      -- 创建时间
    update_time       TIMESTAMPTZ   NOT NULL DEFAULT now()       -- 更新时间（由触发器维护）
);

-- 常用查询索引
CREATE INDEX IF NOT EXISTS ix_recharge_user_time
    ON public.recharge_history (user_id, recharge_time DESC);

CREATE INDEX IF NOT EXISTS ix_recharge_recharge_token
    ON public.recharge_history (recharge_token);

-- 注释（数据字典）
COMMENT ON TABLE  public.recharge_history IS '充值记录表';
COMMENT ON COLUMN public.recharge_history.id               IS '主键（雪花ID等外部生成）';
COMMENT ON COLUMN public.recharge_history.user_id          IS '用户id';
COMMENT ON COLUMN public.recharge_history.recharge_type    IS '交易类型';
COMMENT ON COLUMN public.recharge_history.recharge_amount  IS '交易金额（NUMERIC(12,2)，>=0.00）';
COMMENT ON COLUMN public.recharge_history.recharge_channel IS '支付渠道';
COMMENT ON COLUMN public.recharge_history.recharge_time    IS '交易时间（timestamptz）';
COMMENT ON COLUMN public.recharge_history.recharge_status  IS '交易状态';
COMMENT ON COLUMN public.recharge_history.recharge_remote_id IS '远程支付id';
COMMENT ON COLUMN public.recharge_history.recharge_membership_level IS '充值套餐等级';
COMMENT ON COLUMN public.recharge_history.recharge_credits  IS '充值积分（NULL 表示无积分充值）';
COMMENT ON COLUMN public.recharge_history.recharge_item_id IS '关联套餐';
COMMENT ON COLUMN public.recharge_history.recharge_token   IS '幂等令牌（user_id+recharge_token 唯一；NULL 不参与约束）';
COMMENT ON COLUMN public.recharge_history.remark           IS '备注';
COMMENT ON COLUMN public.recharge_history.recharge_extra   IS '充值额外信息（如 stripe 支付id）';
COMMENT ON COLUMN public.recharge_history.create_time      IS '创建时间';
COMMENT ON COLUMN public.recharge_history.update_time      IS '更新时间（触发器维护）';

INSERT INTO public.users
(id, nickname, avatar, subscription_id, free_credits, membership_credits, purchase_credits, project_count_limit, membership_created_at, membership_expires_at, membership_level, membership_next_month_update_at, free_next_month_update_at, is_first_recharge, last_login_at, last_updated_at, created_at, created_at_str)
VALUES('1', 'system', '', '', 0, 0, 0, 10, '2025-11-20 09:59:27.442', '2025-11-20 09:59:27.442', 0, '2025-11-20 09:59:27.442', '2025-12-01 08:00:00.000', true, '2025-11-20 09:59:27.442', '2025-11-20 09:59:27.442', '2025-11-20 09:59:27.442', '2025-11-20 09:59:27 GMT+8');
