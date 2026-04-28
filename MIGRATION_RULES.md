# GSMGC Next.js 迁移铁律

> **最高优先级文件**。任何违反此文件规则的实现，都是错误。
> 创建：2026-04-28

---

## 🎯 唯一目标

这是一个**迁移项目，不是重构项目**：

> **将现有 gsmgc.es 网站完整迁移到 Next.js（SSG/ISR），实现性能升级，同时保证用户体验、URL、SEO、业务逻辑 100% 不变。**

---

## 🔒 三个"绝对不变"

### 1. 页面与体验不变
- UI、布局、样式、文案 **全部保持一致**
- 不做任何设计优化

### 2. URL 与 SEO 不变
- 产品页必须保持：`/producto/[id]/[slug]`
- 不新增、不删除、不改写 URL
- 不产生 301/断链
- 已有 SEO 结构全部保留

### 3. 业务逻辑不变
- 登录、购物车、下单流程 **完全按现站**
- 所有数据来自现有 API（api.gsmgc.es）
- 不新增业务规则、不"优化逻辑"

---

## ⚙️ 唯一允许做的事

- 用 Next.js 重写（App Router）
- 用 SSG / ISR 提升性能
- 代码结构优化（组件化、TypeScript）
- SEO 标准化（metadata / sitemap / robots）

---

## ❌ 明确禁止

- ❌ 改 UI / UX
- ❌ 改 API
- ❌ 重设计流程
- ❌ 加新功能
- ❌ 做"自认为更好"的优化

---

## 🚨 开发顺序

### Phase 1：Auth（先做，必须先完成）
- login / getMe / logout
- token 本地存储
- 刷新后仍保持登录
- ⚠️ 没完成这一步，禁止继续

### Phase 2：Cart
- CartContext（本地状态）
- CartDrawer（UI）
- ProductCard / 产品页加购

### Phase 3：Checkout
- 复刻现站下单流程
- 调用现有 createOrder API
- 不改任何业务规则

---

## 🧭 开发原则

1. **先复刻，再接 API**
2. **先保证一致，再考虑优化**
3. **现站怎么做 → 新站就怎么做**

---

## ✅ 验收标准

每个功能必须满足：
- 用户感觉不到差异
- URL 完全一致
- 数据完全一致
- 行为完全一致

---

## 🧨 底线

> **任何偏离现站行为的实现，都是错误。**

---

## 📁 现站参考文件

| 文件 | 路径 | 用途 |
|------|------|------|
| 现站前端 | `gsmgc-frontend` (Vercel: xueran1980-cloud/gsmgc-frontend) | **所有 UI/UX 的唯一真相源** |
| 新站前端 | `gsmgc-next` (Vercel: xueran1980-cloud/gsmgc-next) | 迁移目标 |
| 后端 API | `wp-plugin-gsmgc-auth/gsmgc-auth.php` | **所有业务逻辑的唯一真相源** |

### 比对方法

修改新站任何 UI/逻辑前，**必须先读现站对应文件**，确保完全一致。
- 现站路径：`C:\Users\xuera\Desktop\20260401192523\gsmgc-frontend\`
- 新站路径：`C:\Users\xuera\Desktop\20260401192523\gsmgc-next\`
