# Locker

> 基于认证圈子的中文社交平台 · NestJS + Next.js + PostgreSQL

Locker 以**认证圈子**为核心:用户通过邀请码、审批、邮箱、定位等多种方式加入圈子,在圈内发帖、评论、点赞、关注他人。

> 详细功能清单见 [LOCKER_FEATURES.md](./LOCKER_FEATURES.md) · 开发路线图见 [ROADMAP.md](./ROADMAP.md)

---

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | NestJS 10 · Prisma 5 · PostgreSQL 16 · Passport/JWT · nodemailer |
| 前端 | Next.js 14 (App Router) · Tailwind CSS 3 · Zustand · Axios |
| 基础设施 | pnpm workspaces · Docker Compose (Postgres + Redis) |
| 共享 | `@locker/shared` workspace package |

---

## 环境要求

| 工具 | 版本 | 作用 |
|---|---|---|
| Node.js | ≥ 18 | 运行时 |
| pnpm | ≥ 8 | 包管理(workspaces) |
| Docker Desktop | 任意稳定版 | 提供 Postgres + Redis 容器 |
| macOS / Linux / WSL | - | 开发环境 |

> 也可以不用 Docker,本地直接装 PostgreSQL 16 + Redis 7,只要 `DATABASE_URL` 指到对应实例即可。

---

## 目录结构

```
locker/
├── apps/
│   ├── api/            NestJS 后端(端口 3089)
│   │   ├── prisma/     schema.prisma 与 migrations
│   │   └── src/modules/  auth / user / circle / follow / post / comment / notification / verification
│   └── web/            Next.js 前端(端口 3088)
│       └── src/app/    App Router 页面(login, register, feed, circles, users/[id], ...)
├── packages/shared/    跨端共享类型/常量
├── docker/             docker-compose.yml
├── .env.example        环境变量模板
└── ROADMAP.md          开发路线图
```

---

## 环境变量

项目使用**两个位置**的环境变量文件(已在 `.gitignore` 中忽略):

### `apps/api/.env` — 后端必需

Prisma CLI 与 Nest 运行时都从 `apps/api/` 作为 cwd 读取,**这个是主配置**。

```bash
# Database
DATABASE_URL="postgresql://locker:locker@localhost:5432/locker?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server
API_PORT=3089

# Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760

# Email(邮箱验证功能,支持 126/163/企业邮箱的 SMTP)
SMTP_HOST="smtp.126.com"
SMTP_PORT=465          # 465=SSL,587=STARTTLS。代码默认 secure:true,建议用 465
SMTP_USER="your_mail@126.com"
SMTP_PASS="your_smtp_authorization_code"   # 注意:不是登录密码,是"客户端授权码"

# 可选:位置认证用腾讯地图 Key(不填走 OSM Nominatim 回退)
# QQ_MAP_KEY="xxxxxxxx"
```

### `apps/web/.env.local` — 前端可选

仅用来覆盖 API 地址,不填会用默认值 `http://localhost:3089/api`。

```bash
NEXT_PUBLIC_API_URL="http://localhost:3089/api"
```

---

## 本地启动

```bash
# 1. 安装依赖(monorepo,只需在根目录跑一次)
pnpm install

# 2. 启动数据库与 Redis
pnpm docker:up

# 3. 跑 Prisma 迁移 + 生成客户端(首次必须)
pnpm db:migrate
pnpm db:generate

# 4. (可选)种子数据
pnpm db:seed

# 5. 并行启动后端 + 前端
pnpm dev
```

启动后访问:

| 地址 | 说明 |
|---|---|
| http://localhost:3088 | Web 前端 |
| http://localhost:3089/api | 后端 REST API |
| http://localhost:3089/api/docs | Swagger 文档 |

### 单独启动

```bash
pnpm dev:api        # 仅后端 (nest --watch)
pnpm dev:web        # 仅前端 (next dev)
```

### 常用脚本

```bash
pnpm build          # 全部构建
pnpm build:api      # 仅后端构建
pnpm build:web      # 仅前端构建
pnpm lint           # 代码检查

pnpm db:migrate     # 迁移开发库
pnpm db:generate    # 生成 Prisma Client(改 schema 后必跑)
pnpm db:studio      # 打开 Prisma Studio GUI
pnpm db:seed        # 灌种子数据
```

---

## 退出与清理

```bash
# 停止 dev 进程
Ctrl + C            # 在运行 pnpm dev 的终端

# 停止数据库容器(数据保留在 Docker volumes)
pnpm docker:down

# 彻底清空数据(谨慎!会删除所有帖子、用户)
docker compose -f docker/docker-compose.yml down -v

# 清理 node_modules 与构建产物
pnpm clean
```

---

## 常见问题

### Q: `pnpm db:migrate` 报 `Environment variable not found: DATABASE_URL`

Prisma CLI 从 `apps/api/` 为工作目录读 `.env`。确认 `apps/api/.env` 存在且包含 `DATABASE_URL`。

### Q: `docker: command not found`

安装 Docker Desktop:https://www.docker.com/products/docker-desktop/

### Q: 端口 3088 / 3089 / 5432 被占

- 3088/3089:改对应 app 的 `.env` 或启动时 `PORT=xxxx pnpm dev:xxx`
- 5432:改 `docker/docker-compose.yml` 里 `ports`,同时改 `DATABASE_URL`

### Q: SMTP 发信失败

- 确认 `SMTP_PASS` 是**客户端授权码**(126/163 邮箱后台:设置 → POP3/SMTP/IMAP 开启并生成授权码),不是登录密码
- 防火墙/公司网络可能拦截 465 端口,可尝试 `SMTP_PORT=587` 并把 `verification.service.ts` 里 `secure: true` 改为 `secure: false`

### Q: 修改 `schema.prisma` 后类型没更新

```bash
pnpm db:generate    # 或者在 apps/api/ 里 npx prisma generate
```

### Q: 数据库想从头开始

```bash
docker compose -f docker/docker-compose.yml down -v  # 删 volume
pnpm docker:up
pnpm db:migrate
```

---

## 生产部署

> 本项目 MVP 阶段尚未提供 CI/CD,下文是推荐方案。

### 方案一:Docker Compose 单机部署(最简单)

在服务器上准备:
- Docker + Docker Compose
- 域名与 SSL(推荐 Caddy 或 Nginx + Let's Encrypt)
- 2 核 4G 起步

推荐扩展 `docker-compose.yml`:

```yaml
services:
  postgres:    # 保持现有配置,把 ports 删掉或只对内
  redis:       # 同上
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile    # 需新增
    env_file: ./apps/api/.env.production
    depends_on: [postgres, redis]
    restart: unless-stopped
    ports:
      - "3089:3089"
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile    # 需新增
    environment:
      - NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
    restart: unless-stopped
    ports:
      - "3088:3088"
```

还需要为 `apps/api/` 和 `apps/web/` 各写一个 Dockerfile(多阶段构建),以及给 Next.js 打包配置 `output: 'standalone'`。

### 方案二:平台化部署

| 组件 | 推荐平台 | 原因 |
|---|---|---|
| 前端 (Next.js) | Vercel / Cloudflare Pages | 原生支持 App Router 与 ISR |
| 后端 (NestJS) | Railway / Fly.io / Render | Docker 一键部署,支持后台任务 |
| 数据库 | Supabase / Neon / RDS | 托管 Postgres,省运维 |
| Redis | Upstash / Redis Cloud | Serverless Redis |
| 对象存储(未来) | 阿里云 OSS / Cloudflare R2 | 存头像、帖子图片 |

### 方案三:Kubernetes(规模上来之后)

- Postgres → Operator(CloudNativePG)或外部托管
- Redis → Bitnami Helm chart
- API/Web → 各自 Deployment + HPA
- 证书 → cert-manager

### 部署前检查清单

- [ ] `JWT_SECRET` 换成高熵字符串(不要用 default-secret)
- [ ] `DATABASE_URL` 用生产 Postgres 的 URL,并加 `?sslmode=require`
- [ ] `WEB_URL` 设为前端生产域名(影响 CORS)
- [ ] `SMTP_*` 使用生产邮箱
- [ ] 关闭 Swagger 或加鉴权(目前 `main.ts:44` 的 `/api/docs` 是公开的)
- [ ] 数据库备份方案(pg_dump cron / 托管平台的 PITR)
- [ ] 日志收集(stdout → 平台日志,或接入 Sentry/Logtail)
- [ ] 反向代理前面加 CDN(Cloudflare)

---

## 开发约定

- **Axios 拦截器已解包 `response.data`** — 前端所有 `const res: any = await someApi.xxx()`,不写 `res.data`
- **通用 Like 模型** — `Like(targetType, targetId)`,点赞数用 `prisma.like.groupBy` 计算,不用 `_count.likes`
- **CircleMember 状态** — `status`:0 待审批 / 1 已通过 / 2 已拒绝 / 3 已封禁;`role`:OWNER / ADMIN / MEMBER
- **NotificationModule 是 `@Global()`** — 任何模块可直接注入 `NotificationService`
- **`@IsOptional()` 不跳过 `""`** — 用 `@Transform(trimOrUndefined)` 把空字符串转成 undefined
- **全部 UI 文案用中文**

详见 [CLAUDE.md](./CLAUDE.md)。

---

## 许可证

私有项目,版权保留。
