# 🚀 上线前审计报告

> 时间: 2026-05-03 12:15 | 状态: 🟡 1 P1 待修复，其余全部通过  
> 范围: gsmgc-next (localhost) vs gsmgc.es (旧站)

---

## 📊 审计总览

| 维度 | 通过 | 失败 | 警告 |
|------|------|------|------|
| 1. 全页面 200 | 11/11 ✅ | 0 | 0 |
| 2. 数据对齐 | 5/5 ✅ | 0 | 1 ⚠️ |
| 3. SEO | 4/4 ✅ | 0 | 3 ⚠️ |
| 4. 构建质量 | 0 CRIT | 0 ERR | 2 ⚠️ |
| 5. Robots/Sitemap | 2/2 ✅ | 0 | 0 |
| 6. 产品详情页 | ❌ | 1 P1 | 0 |

---

## 1. 全页面 200 ✅

| # | URL | HTTP | 状态 |
|---|-----|------|------|
| 1 | / | 200 | ✅ |
| 2 | /tienda | 200 | ✅ |
| 3 | /tienda?category=samsung | 200 | ✅ |
| 4 | /tienda?search=pantalla | 200 | ✅ |
| 5 | /contacto | 200 | ✅ |
| 6 | /carrito | 200 | ✅ |
| 7 | /checkout | 200 | ✅ |
| 8 | /mi-cuenta | 200 | ✅ |
| 9 | /sobre-nosotros | 200 | ✅ |
| 10 | /devoluciones | 200 | ✅ |
| 11 | /envios-y-entregas | 200 | ✅ |
| 12 | /politica-de-privacidad | 200 | ✅ |

---

## 2. 数据对齐 ✅

| 品牌 | Legacy | New | 状态 |
|------|--------|-----|------|
| samsung | 427 | 427 | ✅ |
| iphone | 457 | 457 | ✅ |
| xiaomi | 357 | 357 | ✅ |
| huawei | 101 | 101 | ✅ |
| oppo | 198 | 198 | ✅ |

| 搜索 | Legacy | New | 状态 |
|------|--------|-----|------|
| "pantalla iphone" | 3 | 3 | ✅ |
| "cargador samsung" | 0 | 0 | ✅ |
| "funda" | 26 | 26 | ✅ |
| "bateria" | 249 | 249 | ✅ |

| 分页 | Legacy | New | 状态 |
|------|--------|-----|------|
| samsung | 18页 | 18页 | ✅ |
| iphone | 20页 | 20页 | ✅ |
| xiaomi | 15页 | 15页 | ✅ |
| huawei | 5页 | 5页 | ✅ |
| oppo | 9页 | 9页 | ✅ |

⚠️ 排序对比有差异 — 因为 compare 脚本按 popularity-desc 而非旧站默认 price-desc，非功能问题。

---

## 3. SEO ✅

| 页面 | Title | Meta Description | Canonical |
|------|-------|------------------|-----------|
| / | ✅ | ✅ | ✅ gsmgc.es |
| /tienda | ✅ | ✅ | ✅ gsmgc.es/tienda |
| /contacto | ✅ | ✅ | ✅ gsmgc.es/contacto |
| /sobre-nosotros | ✅ | ✅ | ⚠️ 缺失 |
| /carrito | ✅ | ✅ | ⚠️ 缺失 |

⚠️ `/sobre-nosotros` 和 `/carrito` 缺少 canonical URL（P3，不影响上线）

---

## 4. 构建质量 ✅

| 类别 | 数量 |
|------|------|
| 🔴 CRITICAL | 0 ✅ |
| ⚠️ HIGH | 0 ✅ |
| 🔶 WARN | 0 ✅ |

⚠️ 2 个系统警告（非代码问题）：
- Turbopack root warning (workspace 配置)
- 2MB fetch cache limit exceeded (products-raw 3.5MB，无害)

---

## 5. Robots/Sitemap ✅

- robots.txt: `Allow: /`, `Disallow: /api/`, `Disallow: /_next/` ✅
- sitemap.xml: 使用 gsmgc.es 域名，`<lastmod>` 更新正确 ✅

---

## 6. 🚨 P1 - 产品详情页 404

**现象**: 产品详情页在 Vercel 生产环境返回 404
```
GET /producto/5993 → 404
GET /producto/5311 → 404
GET /producto/7317 → 404
GET /producto/5507 → 404
```

**可能原因**:
1. Vercel 生产部署的还是旧代码（修复 commit `7cc3e1f` 可能未正确部署）
2. 或 SSR fetchProducts() 在 Vercel 服务端因 CF Bot Fight Mode 被拦截

**验证方法**: 本地 fixture 无法测试产品详情（缺少个别产品数据），必须在 Vercel 验证

---

## 🔧 本次会话修复汇总

| # | 问题 | 文件 | 状态 |
|---|------|------|------|
| 1 | 图片 `object-cover` 裁切 | ProductCard.tsx | ✅ |
| 2 | 标题 `line-clamp-2` 截断 | ProductCard.tsx | ✅ |
| 3 | 排序默认值错误 | TiendaClient.tsx | ✅ |
| 4 | 排序选项顺序+文案不对 | TiendaClient.tsx | ✅ |
| 5 | `applySort()` 忽略排序参数 | display-formatter.ts | ✅ |
| 6 | API 路由未传 orderby/order | route.ts | ✅ |
| 7 | 购物车 MOQ 提示多余 | CarritoClient + CartDrawer | ✅ |

---

## 📋 上线前 Checklist

- [x] 所有页面 200
- [x] 品牌数量一致
- [x] 搜索一致性
- [x] 分页一致性
- [x] SEO meta 标签
- [x] robots.txt + sitemap.xml
- [x] 构建无错误
- [x] 图片显示对齐
- [x] 标题完整显示
- [x] 排序功能修复
- [x] 购物车对齐
- [ ] 产品详情页 Vercel 验证 ← P1
- [ ] Cloudflare 校准
- [ ] 实单测试

---

## 🎯 下一步

1. **推送 dev → master → Vercel**
2. **验证产品详情页**在 Vercel 是否恢复 200
3. **Cloudflare 校准**（SEO 隔离规则）
4. **实单测试**（Checkout 全链路）
