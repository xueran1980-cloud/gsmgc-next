# PROJECT STATE

> ⚡ 终局状态系统 — 唯一进度真相源  
> Git + 本文件 + 本地运行 = 三大真相源  
> Chat 不作为记忆 · 人工不记录进度  
> 更新：2026-05-02 17:16

---

## MODE: READY_TO_DEPLOY (deploy: BLOCKED → 等待 UTC 00:00)

**主模式**：🔒 PRODUCTION FREEZE — 数据解释逻辑已锁定  
**部署**：Vercel 待恢复 → 部署后进入 GO-LIVE 验证

> 冻结生效：2026-05-02 17:16  
> 新站与现站 6/6 维度 100% 对齐  
> 部署前验证全部通过，等待 Vercel 恢复

---

## 🔒 冻结范围（禁止修改）

| 系统 | 锁定的规则 |
|------|-----------|
| category filtering | **slug-only**，禁止 `parseInt` / `name` / `id` 匹配 |
| brand | **= product_cat 视图**，禁止独立 brand 系统 |
| search | **title + SKU 加权匹配**，禁止改动评分模型 |
| sorting | **primary + id tie-break**，禁止改排序规则 |
| pagination | **API totalCount/totalPages**，禁止前端 `slice()` 假分页 |
| API structure | **禁止改路由/响应格式/字段名** |

## ✅ 允许操作（仅限）

1. **UI 对齐** — 视觉、间距、样式（不改数据逻辑）
2. **文案修复** — 标题截断、价格显示格式
3. **Bug 修复** — 500 / 下单失败 / 登录异常
4. **性能优化** — 加载速度、bundle 大小（不改行为）

## ❌ 禁止操作

- 修改过滤/排序/搜索逻辑
- 修改 API 结构或数据流向
- 引入新架构（SWR / realtime / websocket / event system）
- 改 WooCommerce 数据结构
- "顺手优化逻辑"  

> 状态切换规则：
> - 额度耗尽 → `BLOCKED`
> - Vercel 恢复 + 未部署 → `READY_TO_DEPLOY`
> - 部署成功后无待处理 → `FREEZE`
> - 主动开发中 → `DEV`

---

## DATA SOURCE

| 环境 | 数据源 | 通道 |
|------|--------|------|
| **production** | WooCommerce (api.gsmgc.es) | Vercel rewrite `/api/proxy/...` |
| **dev (localhost)** | fixtures/*.json | 本地文件（绕过 SG CAPTCHA） |

- fixtures 从 `gsmgc.es` 旧站 Vercel proxy 获取（SG CAPTCHA 拦截直连）
- fixtures 更新时机：WC 后端有新分类/产品时重新拉取
- 生产模式代码不变，仅 `NODE_ENV=development` 切换数据源

---

## CORE SYSTEM STATUS

| 系统 | 状态 | 数据源 | 说明 |
|------|------|--------|------|
| brand system | ✅ unified | product_cat | WP 分类即品牌，三模匹配(ID/slug/name) |
| category system | ✅ unified | product_cat | 30 分类，BRAND_CATEGORY_NAMES 控制显示分组 |
| pagination | ✅ API-driven | products/route.ts | totalCount/totalPages/page 元数据 |
| checkout | ✅ stable | smartFetch → proxy | 幂等+重试+降级+三态状态机 |
| cart | ✅ stable | localStorage | 无限制，与现站一致 |
| auth flow | ✅ stable | /api/auth/* → proxy | AuthContext + localStorage token |
| product listing | ✅ real-time | products/route.ts | SSR force-dynamic，禁止 SSG |
| product detail | ✅ SSR | producto/[id]/[slug] | force-dynamic + related products |
| CSS safety | ✅ guarded | css-guard.mjs prebuild | 防 Tailwind v4 层级回退 |
| observability | ✅ active | order-metrics.ts | 指标+告警+错误分级 |
| order safety | ✅ active | order-state.ts | 幂等+一致性校验+状态机 |
| auto recovery | ✅ active | orders/create/route.ts | 最多2次重试+降级 |

---

## COMPLETED MODULES

```
auth flow          → 登录/注册/me 全链路
product listing    → /tienda SSR + filter/search/sort
brand filtering    → slug-only，product_cat 统一
pagination fix     → API 元数据驱动，前后端统一
checkout safety    → 幂等+日志+一致性校验+重试+降级+三态
observability      → 指标面板+错误分级+自动告警
CSS guard          → 层级扫描+prebuild hook
deploy control     → dev→master 分支流+pre-push hook
local dev fixture  → 绕过 SG CAPTCHA 的 dev 模式
category config    → 统一配置 (category-config.ts)
display formatting → WC theme 展示对齐 (display-formatter.ts)
comparison system  → Legacy vs New 对比工具 (scripts/compare-legacy-vs-new.mjs)
state alignment    → 6/6 维度 100% 对齐 (slug-only + tie-break)
```

---

## KNOWN ISSUES

| 问题 | 严重度 | 状态 |
|------|--------|------|
| Vercel deploy 额度耗尽 | BLOCKED | 等 UTC 00:00 恢复 |
| SG CAPTCHA 拦截本地请求 | WORKAROUNDED | fixtures 模式绕过 |
| 3 个静态页 404 | P3 | `/terminos`, `/envios`, `/aviso-legal` 未实现 |
| BRAND_CATEGORY_NAMES 含不存在分类 | P3 | APPLE/NOKIA 等不在 WP，不影响功能 |

---

## PENDING

- [ ] Vercel deploy — 合并 dev → master 触发 Production Deploy
- [ ] 线上验证品牌筛选（samsung → 427 产品）
- [ ] 线上验证分页（totalPages 正确）
- [ ] 线上验证 checkout 全链路
- [ ] 更新 fixtures（如有新数据）

---

## LAST STEP (2026-05-02 17:20)

```
🚀 READY_TO_DEPLOY
✅ 部署前全量验证通过
   - 8/8 P0 页面 200
   - 6/6 Legacy vs New 对比 ALL GOOD
   - 搜索: 3 结果 "pantalla iphone"
   - 产品页: 200
   - API: 2076 产品 + 30 分类
⏳ Vercel 待 UTC 00:00 恢复 → merge dev → master
```

## GO-LIVE CHECKLIST

### 步骤 1: 部署（UTC 00:00 后执行）
```bash
git checkout master && git merge dev && git push origin master
```
Vercel 自动触发 Production Deploy（已配置 production branch = master）

### 步骤 2: P0 验证（部署后立即）
- [ ] `gsmgc-next.vercel.app/tienda` → 200
- [ ] `gsmgc-next.vercel.app/tienda?category=samsung` → 427 产品
- [ ] 分页可点击，数据变化
- [ ] 搜索 "pantalla iphone" → 3 结果
- [ ] `gsmgc-next.vercel.app/producto/:id` → 正常
- [ ] `/api/orders/create` → 不被拦截

### 步骤 3: Cloudflare 校准
- [ ] `/api/*` → 跳过 Bot Fight Mode
- [ ] 放行 Vercel IP
- [ ] 不缓存: `/api/orders/*` `/checkout`
- [ ] 限流: `POST /api/orders/create`

### 步骤 4: 实单测试
- [ ] 成功下单 1 次
- [ ] 模拟失败（断网/刷新）→ 不重复下单
- [ ] 状态一致（success / processing）

### 步骤 5: 最终对比
```bash
node scripts/compare-legacy-vs-new.mjs
```
- [ ] 6/6 ALL GREEN

### GO / NO-GO
- [ ] GO: 全部 ✅ → 上线
- [ ] NO-GO: 任一 ❌ → 回滚

---

## NEXT ACTION

```
1. Vercel 恢复 → git checkout master && git merge dev && git push origin master
2. gsmgc-next.vercel.app/tienda?category=samsung → 验证 427 产品
3. 验证通过 → 部署完成，保持 FREEZE
```

---

## INCREMENTAL LOG

> 只记录变化，不重复历史。每次状态切换/系统改动追加一条。

```
2026-05-02 17:20 | 🚀 READY_TO_DEPLOY | 部署前全量验证通过，GO-LIVE checklist 就绪
2026-05-02 17:16 | 🔒 PRODUCTION FREEZE | 数据解释逻辑锁定，6/6 对齐
2026-05-02 17:14 | STATE ALIGNMENT 完成 | slug-only + 确定性排序 + 100% 对齐
2026-05-02 17:00 | comparison script 完成 | Legacy vs New 对比系统
2026-05-02 16:35 | display-formatter 上线 | WC theme 展示逻辑对齐
2026-05-02 16:30 | MODE: BLOCKED | PROJECT_STATE.md 创建
2026-05-02 16:00 | fixtures 模式上线 | dev 数据源切换
2026-05-02 14:00 | MODE: FREEZE 基线锁定 | 5层安全栈完成
```
