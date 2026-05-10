# PROJECT_ARCHITECTURE.md - GSMGC 生产系统架构与红线

> **状态**: 🟢 LIVE
> **更新**: 2026-05-10
> **维护**: 老板 + 小妖怪
> **性质**: **生产事故级规则文档** — 违反任何红线 = 未来事故

---

## 1. 当前真实生产链路

```
Browser (用户)
  → gsmgc.es (Vercel Next.js 边缘节点)
    → 静态资源: Vercel CDN
    → API 请求: 直连 api.gsmgc.es (浏览器 fetch / 服务端 fetch)
  → api.gsmgc.es (SiteGround WordPress + WooCommerce)
    → Cloudflare (Bot Fight Mode: 拦 Vercel IP，放过浏览器)
    → WordPress REST API
    → MySQL (pgt_ 前缀)
```

### 关键事实

| 组件 | 地址 | 用途 |
|------|------|------|
| 前端 | `gsmgc.es` | Next.js 16.2.4, Vercel 部署 |
| 后端 API | `api.gsmgc.es` | WordPress + WC 10.6.1, SiteGround |
| 数据库 | SiteGround MySQL | 前缀 `pgt_` |
| CDN/安全 | Cloudflare | Bot Fight Mode, WAF |

---

## 2. Auth 设计（强制规范）

### 核心原则

- **Token Only**：64位 hex token，存 `localStorage`
- **无 Cookie Session**：不使用 PHP session
- **无 SSR Auth**：不在服务端渲染用户态
- **Bearer 认证**：`Authorization: Bearer <token>`

### Token 生命周期

```
登录成功
  → gsmgc-auth.php 生成 64位 hex token
  → 存 WordPress user meta (`pgt_usermeta`)
  → 返回 token + user 数据
  → 前端存 localStorage
  → 每次 API 请求带 `Authorization: Bearer <token>`
  → token 有效期 30 天
  → 单设备登录（v9.2+）：新登录使旧 token 失效
```

### ❌ 禁止事项

- 禁止 `document.cookie` 存 token
- 禁止服务端 `req.cookies` 读取用户态
- 禁止 Next.js middleware 做 auth redirect
- 禁止使用 PHP `$_SESSION`

---

## 3. 系统红线（违反 = 生产事故）

### 🔴 RED LINE 1: Vercel server-side → Cloudflare protected API

```
❌ 禁止：
  Vercel (server-side fetch)
    → api.gsmgc.es (Cloudflare Bot Fight Mode)
    → 被拦截，返回 CF HTML challenge
    → res.json() 崩溃：Unexpected token '<'

✅ 正确：
  Browser fetch → api.gsmgc.es (浏览器过 CF challenge)
  Vercel server-side fetch → api.gsmgc.es (直连，但 CF 可能拦)
  解决：统一用 fetchWithFallback.ts 的直连模式
```

**历史事故**: 2026-05-10 登录 500 错误，根因就是此问题。

---

### 🔴 RED LINE 2: /api/proxy/ 重写规则

```
❌ 禁止在 next.config.ts 中添加：
  { source: '/api/proxy/:path*', destination: '...' }

原因：
  1. 新增此 rewrite = 引入 Vercel server-side → CF API 链路
  2. AI / 新工程师 / 未来的自己 容易误用
  3. 2026-05-10 事故后已删除，禁止恢复
```

**当前状态**: ✅ 已删除（2026-05-10）

---

### 🔴 RED LINE 3: Auth Middleware Redirect

```
❌ 禁止在 middleware.ts 中：
  - NextResponse.redirect() 到登录页
  - 读取 cookie 判断用户态
  - 任何服务端 auth 逻辑

原因：
  1. 破坏 SPA 客户端路由
  2. 与 localStorage token 设计冲突
  3. 导致无限重定向循环
```

**当前状态**: ✅ middleware.ts 仅做 CORS + rate limit

---

### 🔴 RED LINE 4: vercel.json 与 next.config.ts 共存

```
❌ 禁止同时存在：
  vercel.json (rewrite)
  next.config.ts (rewrites)

原因：
  1. Vercel 部署时两者冲突 → 全站 404
  2. 2026-04 事故（commit c7d556a）

✅ 正确：
  只用 next.config.ts rewrites
  删除 vercel.json
```

**当前状态**: ✅ 已删除 vercel.json（2026-04）

---

### 🔴 RED LINE 5: 修改后端 PHP（未经老板批准）

```
❌ 禁止直接修改：
  - gsmgc-auth.php 核心逻辑
  - WooCommerce 核心文件
  - WordPress 核心代码

✅ 正确流程：
  1. 提 issue
  2. 老板批准
  3. 修改 mu-plugins
  4. FTP 上传到 SiteGround
  5. 验证 + 记录
```

**当前状态**: ✅ mu-plugins 是唯一的后端扩展点

---

## 3.5 当前阶段：STABILIZATION PHASE

> **规则生效日期**: 2026-05-10
> **性质**: 稳定期，禁止系统级重构

### 阶段规则

| 规则 | 说明 |
|------|------|
| ❌ 禁止系统级重构 | 不允许修改架构层、抽象层、状态机 |
| ✅ 只允许 bug fix | P0/P1 bug 可以修复 |
| ⚠️ Abstraction 变更需人工批准 | 任何抽象层变更必须老板批准 |
| ⚠️ safeApiFetch 暂不作为强制依赖 | Phase 2-5 暂停，等待批准 |

### safeApiFetch 迁移计划更新

| 阶段 | 范围 | 状态 | 备注 |
|------|------|------|------|
| Phase 1 | `fetchWithFallback.ts` | ✅ 完成 | 已部署 |
| Phase 2 | `route.ts` (auth/login) | ⏸️ 暂停 | 需人工批准 |
| Phase 3 | `route.ts` (products) | ⏸️ 暂停 | 需人工批准 |
| Phase 4 | `route.ts` (categories) | ⏸️ 暂停 | 需人工批准 |
| Phase 5 | `route.ts` (checkout) | ⏸️ 暂停 | 需人工批准 |

---

## 4. 历史事故（必须记录，防止重复）

### 2026-05-10: Cloudflare Challenge 导致登录 500

**现象**:
- 生产环境登录返回 500
- `Unexpected token '<'` 错误

**根因**:
- `fetchWithFallback.ts` 的 fallback 路径走到 `/api/proxy/`
- `/api/proxy/` 是 Vercel rewrite → server-side fetch 到 `api.gsmgc.es`
- Cloudflare Bot Fight Mode 拦截 Vercel IP
- 返回 CF HTML challenge
- `res.json()` 解析 HTML → 崩溃

**修复**:
1. 统一直连 `api.gsmgc.es`（移除 `/api/proxy/` fallback）
2. 创建 `safeApiFetch.ts` 统一 API 安全层
3. 删除 `next.config.ts` 中的 `/api/proxy/` rewrite
4. 所有 route.ts 改用直连

**教训**:
- **从架构层消除故障源**，不是打补丁
- **删除危险代码**（如 `/api/proxy/`），而不是文档警告
- **统一 API 层**，避免每个 route.ts 自己 fetch

---

### 2026-04-XX: vercel.json + next.config.ts 冲突导致全站 404

**现象**:
- 部署后全站 404

**根因**:
- `vercel.json` 和 `next.config.ts` 都定义了 rewrites
- Vercel 部署时冲突

**修复**:
- 删除 `vercel.json`
- 只用 `next.config.ts`

**commit**: c7d556a

---

### 2026-XX-XX: Next.js 16.2.4 RSC 500 bug

**现象**:
- `<Link>` 导航到 `force-dynamic` 页面时报 500

**根因**:
- Next.js 16.2.4 bug (#92907)
- RSC 在处理 `force-dynamic` 页面时崩溃

**修复**:
- 用 `<a>` 标签替代 `<Link>`

---

## 5. 高风险区域（修改需格外小心）

| 区域 | 风险 | 修改前必须 |
|------|------|-----------|
| **Auth** | 用户无法登录，订单丢失 | 老板批准 + 本地验证 |
| **Middleware** | 无限重定向，全站不可用 | 本地测试 + 灰度发布 |
| **Cache** | 数据不一致，价格/库存错误 | 验证 CF + Next.js 缓存 |
| **SSR** | 性能下降，服务器负载高 | 评估必要性 |
| **Cloudflare** | 拦截合法请求，或放过攻击 | 先在 staging 测试 |
| **Vercel** | 部署失败，或全站崩溃 | 通过 pre-push hook 所有 gate |
| **Payment** | 订单丢失，付款未记录 | 禁止修改，除非 P0 bug |
| **Stock** | 超卖，库存不一致 | 5 层防护验证 |

---

## 6. 统一 API 安全层（safeApiFetch.ts）

### 为什么需要

**过去的问题**:
- 每个 route.ts 自己 fetch
- 有的处理 HTML，有的没处理
- 有的 timeout，有的没 timeout
- 有的 `no-store`，有的缓存污染
- 故障行为不一致

**解决方案**: `safeApiFetch.ts`

```typescript
// 统一所有 external fetch
import { safeApiFetch } from '@/lib/safeApiFetch';

const res = await safeApiFetch(url, options);
// 自动处理：
// - timeout (10s)
// - HTML 检测（CF challenge / 500 页面）
// - CF 检测（403 + HTML）
// - JSON parse 安全处理
// - 统一日志
// - 强制 no-store
```

### 迁移计划

> ⚠️ **当前状态：STABILIZATION PHASE**
> safeApiFetch 暂不作为强制依赖。Phase 2-5 暂停，需人工批准才能继续。

| 阶段 | 范围 | 状态 | 备注 |
|------|------|------|------|
| Phase 1 | `fetchWithFallback.ts` | ✅ 完成 | 已部署 |
| Phase 2 | `route.ts` (auth/login) | ⏸️ 暂停 | 需人工批准 |
| Phase 3 | `route.ts` (products) | ⏸️ 暂停 | 需人工批准 |
| Phase 4 | `route.ts` (categories) | ⏸️ 暂停 | 需人工批准 |
| Phase 5 | `route.ts` (checkout) | ⏸️ 暂停 | 需人工批准 |

---

## 7. 部署流程（强制）

### Pre-push Hook v3（5 Gates）

```bash
./deploy.sh
```

**Gate 1**: 无 `vercel.json`
**Gate 2**: `next.config.ts` 无冲突配置
**Gate 3**: `BUILD_STAMP` 存在（来自 `npm run build`）
**Gate 4**: 路由完整性（`/tienda`, `/producto/[id]/[slug]` 等）
**Gate 5**: 人工确认

### 发布门控

- `master` = 生产触发器（push master = Vercel 部署）
- `dev` = 测试分支（不影响生产）
- **禁止直接 push master**，必须通过 `./deploy.sh`

---

## 8. 监控与告警

### 监控脚本

| 脚本 | 频率 | 用途 |
|------|------|------|
| `_monitor.py` v2.3 | 每小时 | 12 项检查（8 基础设施 + 4 功能冒烟） |
| `_verify_backup.py` | 每周 | 备份完整性 |
| `_cert_check.py` | 每周 | SSL 证书有效期 |
| `_push_backup.py` | 每天 | 推送备份到远程 |
| `gsmgc_backup.py` | 每天 02:00 | 数据库备份 |

### 告警

- 邮件通知：`info@gsmgc.es`
- 监控失败 → 立即通知老板

---

## 9. 血泪教训（快速参考）

| 类别 | 教训 |
|------|------|
| **CF** | Bot Fight Mode 拦 Vercel IP → 浏览器可过，server-side 不行。不要再新增 Vercel server-side → CF protected API 链路。 |
| **调试** | 验证失败 = 根因错了，停下来。不在同一假设下连续试错。错误兜底保留原始消息。 |
| **WC** | 退款≠取消不退库存。category 只接受 slug。`s` 是 AND 逻辑需 OR 兜底。 |
| **Next.js** | v16.2.4 `<Link>` 导航 force-dynamic 500，用 `<a>` 绕过。Module 级 Promise 缓存失败锁死空结果。 |
| **部署** | vercel.json + next.config.ts 共存 → 全站 404。hook 阻止 master push。 |
| **架构** | 不要把基础设施能力降级到应用层。Vercel rewrite → Next.js route handler = 引入 bug + 复杂度 + 性能损耗 + 零收益。 |
| **架构** | 分层要有明确收益，不能为了分层而分层。部分采用也是有效结果。 |
| **监控** | 只查端点不够，必须加功能冒烟。监控本身也可能有 bug。 |

---

## 10. 联系人

- **技术负责人**: 老板（在西班牙加纳利群岛）
- **邮箱**: `info@gsmgc.es`
- **WhatsApp**: 688 560 560
- **银行**: YOU MOBILE CANARIAS SL

---

## 变更日志

| 日期 | 变更 |
|------|------|
| 2026-05-10 | 初始版本，记录 2026-05-10 事故 + 系统红线 |

---

**⚠️ 此文件是生产系统宪法。违反任何红线 = 未来事故。修改此文件必须经过老板批准。**
