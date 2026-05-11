# Locker 项目进度与路线图

> 最后更新:2026-05-11
> 对齐文档:`LOCKER_FEATURES.md`、`CLAUDE.md`

---

## 一、已完成(MVP 核心闭环)

### 后端模块(`apps/api/src/modules/`)

| 模块 | 能力 |
|---|---|
| **auth** | 注册(用户名/邮箱/手机号)、密码登录、JWT bearer、全局 `JwtAuthGuard` + `@Public()` |
| **user** | 获取/更新当前用户、获取他人详情、关键字搜索、UserProfile 扩展资料 |
| **circle** | 创建/列表/详情/更新、加入(邀请码+审批双模式)、退出、成员管理(OWNER/ADMIN/MEMBER、改角色、踢人)、邀请码生成/重置、待审批列表、系统圈保护(COMPANY/ALUMNI/REGION 不可手动创建) |
| **post** | 发帖(TEXT/IMAGE/VIDEO/LINK/ANONYMOUS)、Feed 流(聚合已加入圈子)、圈内列表、点赞(通用 Like:targetType 1 帖/2 评)、编辑、置顶、软删除 |
| **comment** | 楼中楼(parentId + replyToId 二段式)、列表(主评论 + top3 回复 + 展开更多)、编辑、删除、点赞 |
| **notification** | `@Global()` 注入;5 种触发:入圈申请/审批通过/审批拒绝/帖子点赞/评论点赞/新评论;未读计数、全部已读 |
| **verification** | 邮箱认证(SMTP 发送 6 位码 + 域名映射自动加入企业/校友圈)、位置认证(腾讯地图 + Nominatim 双通道逆地理 → 自动加入地域圈) |

### 前端页面(`apps/web/src/app/`)

`/login` `/register` `/feed`(内容 + 发现 tabs) `/my-circles` `/circles/create` `/circles/[id]` `/circles/[id]/edit` `/circles/[id]/manage` `/notifications` `/verify`

### 基础设施

- Monorepo:pnpm workspaces + `@locker/shared`
- Docker Compose:PostgreSQL 16 + Redis(Redis 已启但未使用)
- Prisma 迁移已初始化(`20260510021602_init`)
- Swagger 文档:`http://localhost:3089/api/docs`

---

## 二、数据库已有但未启用

| 实体 | schema 定义 | 当前使用情况 |
|---|---|---|
| `Follow` | ✅ | ✅ FollowModule + 个人主页 |
| `Conversation` / `ConversationMember` / `Message` | ✅ | ❌ 无 API |
| `Tag` / `PostTag` | ✅ | ✅ 发帖自动解析写入 + 搜索/话题 API |
| `UserAuth`(第三方登录) | ✅ | ❌ 仅 schema |
| `UserSetting.notifyConfig` | ✅(JSON 默认 `{}`) | ❌ 无配置读写 |

---

## 三、路线图

### Phase 1 — 社交关系闭环 ✅ **已完成**

**目标:让"人"成为内容外的第二个中心,补齐个人主页体验。**

- [x] **关注系统**
  - 后端 `FollowModule`: follow/unfollow、关注列表、粉丝列表、是否相互关注
  - 使用 `Follow` 表的 status 区分 0=已关注 1=拉黑
  - 关注/被关注通知接入 `NotificationService`(type=`follow`)
  - `User._count` 已有 followers/following,接到返回中即可
- [x] **个人主页 `/users/[id]`**
  - 顶部:头像/昵称/简介/认证徽章(verifiedEmail/verifiedCity)、关注/粉丝/帖子/圈子计数
  - Tab:TA 的动态 / TA 的圈子(公开) / 粉丝 / 关注
  - 自己主页 → 编辑入口;他人主页 → 关注/私信按钮(私信后续阶段)

**产出物:**
- `apps/api/src/modules/follow/` 完整模块
- `apps/web/src/app/(authenticated)/users/[id]/page.tsx`
- 新增 `followApi` 到 `lib/api.ts`
- 帖子作者昵称点击跳转主页

---

### Phase 2 — 搜索与话题 ✅ **已完成**

**目标:用内容发现驱动增长,真正用起来 `Tag`/`PostTag`。**

- [x] **SearchModule(统一搜索)**
  - 用户搜索(复用现有 `userApi.search`)
  - 圈子搜索(按名称/描述/标签)
  - 帖子搜索(内容 ilike,仅限用户已加入圈子)
  - 综合搜索入口页 `/search?q=xxx&type=all|user|circle|post`
- [x] **话题标签系统**
  - 发帖时解析 `#xxx#` 或 `#xxx `→ 写入 `Tag` / `PostTag`
  - 单篇 Post 返回 tags 数组,前端渲染可点击胶囊
  - 话题聚合页 `/tags/[name]`:帖子流 + 参与者 + 相关圈子
  - 热门话题:按 `Tag.postCount` 排序,放到 `/feed?tab=discover` 顶部

**产出物:**
- `apps/api/src/modules/search/` + 扩展 `post.service` 写入 Tag
- `apps/web/src/app/(authenticated)/search/page.tsx`、`tags/[name]/page.tsx`
- Header 中增加搜索框

---

### Phase 3 — 私信(IM)

- [ ] `MessageModule`:创建会话(单聊)、获取会话列表、拉取历史消息、发送消息、已读回执
- [ ] WebSocket 网关(`@WebSocketGateway`)+ JWT 鉴权
- [ ] 前端 `/messages` 会话列表、`/messages/[id]` 聊天界面
- [ ] 他人主页"私信"按钮接入

---

### Phase 4 — 内容治理与富媒体

- [ ] 文件上传服务(S3/OSS/本地):头像、帖子图片、视频
- [ ] 举报系统:`Report` 表 + 管理端
- [ ] 敏感词过滤(AC 自动机或第三方)
- [ ] 精华帖标记(新增 `Post.isFeatured`)、圈内公告

---

### Phase 5 — 认证体系补齐

- [ ] 证书/资质上传(手工或 AI 审核)
- [ ] 付费入圈(接入支付)
- [ ] 社交图谱认证(圈内 N 个好友即入)
- [ ] 第三方登录(微信/GitHub/Google → `UserAuth`)

---

### Phase 6 — 工程化

- [ ] 测试框架:Jest(API) + Playwright/Vitest(Web)
- [ ] Redis 真正接入:通知未读计数缓存、热门圈/话题缓存、接口限流
- [ ] `packages/shared` 让 web 真正引用后端 DTO/枚举,消除重复常量
- [ ] 个人中心:设置页(通知开关、隐私、深色模式、注销账号)
- [ ] 收藏 / 浏览历史
- [ ] 邮件模板/SMTP 改为环境变量必填,去掉硬编码 fallback

---

## 四、立即开工(本轮)

1. ✅ 撰写本路线图
2. ✅ **Phase 1 — 关注系统 + 个人主页**(方向 2)
3. ✅ **Phase 2 — 搜索 + 话题标签**(方向 4)

---

## 五、关键约定(来自 CLAUDE.md)

- Axios 响应拦截器已解包 `response.data` → 前端用 `const res: any = await xxx()`,**不用 `res.data`**
- `CircleMember.status`:0=待审 1=通过 2=拒 3=封禁;`role`:OWNER/ADMIN/MEMBER
- `Like` 通用模型:`targetType`(1=post, 2=comment)+ `targetId`,点赞数用 `groupBy` 计算,**不用 `_count.likes`**
- `@IsOptional()` 不跳过 `""` → 用 `@Transform(trimOrUndefined)`
- schema 改动:`pnpm db:generate` 或 `npx prisma db push --skip-generate` + `npx prisma generate`
- UI 文案一律中文
