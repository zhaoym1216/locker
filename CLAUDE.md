# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Locker is a Chinese-language social platform built around authenticated/private circles. Users join circles through various verification methods (approval, invite code, payment, etc.) and can post, comment, like, and interact within circles they belong to.

## Tech Stack

- **Backend**: NestJS 10 + Prisma 5 + PostgreSQL 16 + Passport/JWT auth
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS 3 + Zustand + Axios
- **Shared**: `@locker/shared` workspace package for common types/constants
- **Infra**: Docker Compose (Postgres + Redis)

## Commands

```bash
# Development (run from root)
pnpm dev              # All apps in parallel
pnpm dev:api          # Backend only (port 3089, nest --watch)
pnpm dev:web          # Frontend only (port 3088, next dev)

# Build
pnpm build            # All
pnpm build:api        # Backend only
pnpm build:web        # Frontend only

# Database (from apps/api/)
pnpm db:migrate       # prisma migrate dev
pnpm db:generate      # prisma generate (run after schema changes)
pnpm db:seed          # Seed data
pnpm db:studio        # Prisma Studio GUI

# Docker
pnpm docker:up        # Start Postgres + Redis
pnpm docker:down      # Stop containers
```

No test framework is configured.

## Architecture

### Monorepo Layout (pnpm workspaces)

```
apps/api/             NestJS backend
apps/web/             Next.js frontend
packages/shared/      Shared types
```

### Backend (`apps/api/src/`)

- `modules/` — Feature modules: `auth`, `user`, `circle`, `post`, `comment`, `notification`
- `prisma/` — Prisma service (injectable), schema at `apps/api/prisma/schema.prisma`
- `common/` — Guards, decorators (`@CurrentUser`, `@Public`), filters, DTOs, interceptors
- `main.ts` — Global JwtAuthGuard, HttpExceptionFilter, ValidationPipe

Each module follows NestJS convention: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/*.dto.ts`.

### Frontend (`apps/web/src/`)

- `app/` — Next.js App Router pages: `/login`, `/register`, `/feed`, `/circles/[id]`, `/circles/[id]/edit`, `/circles/[id]/manage`, `/notifications`
- `lib/api.ts` — Axios client with all API endpoint definitions (single file)
- `stores/auth.ts` — Zustand store for auth state (user, token, login/register/logout/fetchUser)

### Key Patterns

**Axios interceptor unwraps `response.data`**: The Axios response interceptor returns `response.data` directly. All frontend API calls use `const res: any = await someApi.method()` — never `res.data`.

**Circle membership model**: CircleMember has `status` (0=pending, 1=approved, 2=rejected, 3=banned) and `role` (OWNER, ADMIN, MEMBER). Posts/comments/likes require `status === 1`.

**Generic Like model**: `Like` uses `targetType` (1=post, 2=comment) + `targetId` — no direct Prisma relation from Post/Comment to Like. Use `prisma.like.groupBy` for like counts, not `_count.likes`.

**Notification system**: `NotificationModule` is `@Global()`. Inject `NotificationService` anywhere. Notifications created on: circle join (to admins), approve/reject (to applicant), post like (to author), comment (to post author), comment like (to comment author).

**class-validator + empty strings**: `@IsOptional()` only skips `null`/`undefined`, not `""`. Use `@Transform(trimOrUndefined)` to convert empty strings to `undefined` before validation.

**Prisma schema changes**: After modifying `schema.prisma`, run `pnpm db:generate` from `apps/api/` to regenerate the Prisma client TypeScript types. For dev, use `npx prisma db push --skip-generate` then `npx prisma generate` separately.

## UI Language

All user-facing text is in Chinese. Error messages, labels, status badges, and button text should use Chinese.
