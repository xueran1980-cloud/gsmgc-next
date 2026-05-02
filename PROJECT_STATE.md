# PROJECT STATE

> ⚡ 终局状态系统 — 唯一进度真相源  
> Git + 本文件 + 本地运行 = 三大真相源  
> Chat 不作为记忆 · 人工不记录进度  
> 更新：2026-05-02 16:30

---

## MODE: BLOCKED

**原因**：Vercel 免费版 100次/日 deploy 额度耗尽  
**恢复时间**：每日 UTC 00:00（加那利群岛 01:00）  
**恢复后动作**：合并 dev → master → Vercel 自动 Production Deploy  

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
brand filtering    → slug/id/name 三模匹配，product_cat 统一
pagination fix     → API 元数据驱动，前后端统一
checkout safety    → 幂等+日志+一致性校验+重试+降级+三态
observability      → 指标面板+错误分级+自动告警
CSS guard          → 层级扫描+prebuild hook
deploy control     → dev→master 分支流+pre-push hook
local dev fixture  → 绕过 SG CAPTCHA 的 dev 模式
category config    → 统一配置 (category-config.ts)
display formatting → WC theme 展示对齐 (display-formatter.ts)
comparison system  → Legacy vs New 对比工具 (scripts/compare-legacy-vs-new.mjs)
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

## LAST STEP (2026-05-02 17:14)

```
✅ STATE ALIGNMENT MODE 完成
✅ 分类过滤: slug-only (移除 parseInt/name)
✅ 排序: 二级键 ID tie-break (确定性)
✅ fixtures 更新同步 live 数据
✅ Legacy vs New 对比 6/6 维度 100% 对齐
✅ TypeScript 0 错误
✅ commit af393c9 推送 dev
⏳ 等待 Vercel 额度恢复
```

---

## NEXT ACTION

```
1. Vercel 恢复 → git checkout master && git merge dev && git push origin master
2. gsmgc-next.vercel.app/tienda?category=samsung → 验证 427 产品
3. 验证通过 → MODE: FREEZE
```

---

## INCREMENTAL LOG

> 只记录变化，不重复历史。每次状态切换/系统改动追加一条。

```
2026-05-02 17:14 | STATE ALIGNMENT 完成 | slug-only + 确定性排序 + 100% 对齐
2026-05-02 17:00 | comparison script 完成 | Legacy vs New 对比系统
2026-05-02 16:35 | display-formatter 上线 | WC theme 展示逻辑对齐
2026-05-02 16:30 | MODE: BLOCKED | PROJECT_STATE.md 创建
2026-05-02 16:00 | fixtures 模式上线 | dev 数据源切换
2026-05-02 14:00 | MODE: FREEZE 基线锁定 | 5层安全栈完成
```
