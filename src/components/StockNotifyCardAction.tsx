'use client';

/**
 * StockNotifyCardAction — Tienda 产品列表卡片上的「缺货到货提醒」入口（列表版）
 *
 * 与详情页 StockNotifyButton 的关系：**完全独立的实现，不共享、不修改后者**。
 * 原因：详情页组件刻意不含 compact/card 变体（购物车入口移出 MVP 时一并删除），
 *       为不重开该已冻结表面，列表侧单独实现本次迭代所需的最小形态。
 *
 * 业务语义（与详情页一致，已冻结，不得扩展）：
 *   一次性到货提醒请求，**不是订阅系统**（无订阅/无退订/无 email 输入/无 double opt-in）。
 *
 * 行为：
 *   - 已登录 → POST /wp-json/gsmgc/v1/stock-notify { product_id } → 成功即调 onDone()
 *   - 未登录 → 走现有登录流程（跳 /mi-cuenta），**绝不创建匿名记录**
 *   - 幂等：发送中禁用按钮（不重复 POST）；后端 UNIQUE(user_id, product_id) 兜底
 *
 * 硬边界：
 *   - 只调用唯一端点 POST /wp-json/gsmgc/v1/stock-notify；body 只含 product_id
 *   - 复用现有认证：Authorization: Bearer <gsmgc_auth_token>
 *   - 失败只显示提示：不自动重试、不改库存/购物车/价格/订单
 *   - 组件不决定「是否该显示」；由父组件在缺货时渲染
 */

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getAuthToken } from '@/api/auth';

const API_STOCK_NOTIFY = 'https://api.gsmgc.es/wp-json/gsmgc/v1/stock-notify';

type SendState = 'idle' | 'sending' | 'error';

interface StockNotifyCardActionProps {
  productId: number;
  /** 成功登记后通知父卡片：立即（无需刷新）切换为确认文案 */
  onDone: () => void;
}

export default function StockNotifyCardAction({ productId, onDone }: StockNotifyCardActionProps) {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<SendState>('idle');
  // ★ 同步守卫：React 状态更新是异步批处理的，同一帧内连点两次时 state 仍为 'idle'，
  //   仅靠 disabled/state 不足以阻止重复 POST ⇒ 用 ref 做同步互斥（失败时释放，允许重试）。
  const inFlight = useRef(false);

  function handleClick(e: React.MouseEvent) {
    // ★ 整张卡片外层是 <Link>：必须同时阻止默认行为与冒泡，否则点击会导航到详情页
    e.preventDefault();
    e.stopPropagation();

    if (inFlight.current) return; // 防重复 POST（不制造不必要的重复请求）

    // ── 未登录：走现有登录流程，绝不创建匿名记录 ──
    if (!isLoggedIn) {
      router.push('/mi-cuenta');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      router.push('/mi-cuenta');
      return;
    }

    inFlight.current = true;
    setState('sending');
    void (async () => {
      try {
        const res = await fetch(API_STOCK_NOTIFY, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            // ★ 复用现有 Bearer 认证机制（不新造认证）
            'Authorization': `Bearer ${token}`,
          },
          // ★ 只传 product_id
          body: JSON.stringify({ product_id: productId }),
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          inFlight.current = false;
          setState('error');
          return;
        }
        const data: { ok?: boolean } | null = await res.json().catch(() => null);
        if (data && data.ok === false) {
          inFlight.current = false;
          setState('error');
          return;
        }
        onDone(); // 成功 → 卡片原地切换为确认文案（由父组件渲染）
      } catch {
        inFlight.current = false;
        setState('error'); // 网络/超时 → 明确报错，不自动重试
      }
    })();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'sending'}
        className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
          state === 'sending'
            ? 'bg-gray-200 text-gray-400 cursor-wait'
            // ★ 2026-09-14：复用原列表卡片「Agotado」的红色视觉体系（bg-red-600 + text-white），
            //   使缺货入口一眼可辨。仅背景色由蓝色改为原 Agotado 红；几何/字号/图标/行为全部不变。
            //   （原 Agotado 是静态 pill 故无 hover；按钮补 hover:bg-red-700 —— 同一 Tailwind 红阶）
            : 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg'
        }`}
      >
        {state === 'sending' ? (
          <>
            <Loader2 size={13} className="animate-spin" /> Enviando…
          </>
        ) : (
          <>
            <Bell size={13} /> Avísame
          </>
        )}
      </button>
      {state === 'error' && (
        <span className="text-[10px] text-red-600 leading-tight text-right">
          No se pudo registrar el aviso.
        </span>
      )}
    </div>
  );
}
