'use client';

/**
 * StockNotifyButton — 一次性「缺货到货提醒」入口（Stock Notify 前端）
 *
 * 业务语义（已冻结，不得扩展）：
 *   这是一次性请求，不是订阅系统。发送成功一次即结束，前端不做持久化回显。
 *
 *   - 已登录 + 缺货 → 「Reabasteciendo」+「Avísame」→ POST /gsmgc/v1/stock-notify
 *   - 未登录 + 缺货 → 「Inicia sesión para recibir un aviso…」→ 跳登录（绝不创建匿名记录）
 *   - 点击成功      → 原地显示「✓ Te avisaremos cuando vuelva a estar disponible.」
 *   - 刷新后重新显示 Avísame（已冻结行为，不为此修改任何现有 API）
 *
 * 边界（硬）：
 *   - 只调用唯一端点 POST /wp-json/gsmgc/v1/stock-notify
 *   - body 只含 product_id；绝不传 user_id / email
 *   - 复用现有认证：Authorization: Bearer <gsmgc_auth_token>
 *   - 失败只显示提示：不自动重试、不改动库存/购物车/价格/订单
 *   - 组件自身不决定「是否该显示」；由父组件在缺货时渲染
 *
 * 范围：MVP 仅在【产品详情页】使用（缺货时）。
 *       购物车入口已按 Owner 裁定移出 MVP（故不再保留 compact 变体）。
 */

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Check, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getAuthToken } from '@/api/auth';

const API_STOCK_NOTIFY = 'https://api.gsmgc.es/wp-json/gsmgc/v1/stock-notify';

type SendState = 'idle' | 'sending' | 'done' | 'error';

interface StockNotifyButtonProps {
  productId: number;
}

const WRAP = 'rounded-2xl border border-amber-200 bg-amber-50/70 p-4 mb-5';
const ICON = 16;

export default function StockNotifyButton({ productId }: StockNotifyButtonProps) {
  const { isLoggedIn, loading } = useAuth();
  const [state, setState] = useState<SendState>('idle');

  async function handleClick() {
    if (state === 'sending') return; // 防重复 POST（不制造不必要的重复请求）
    const token = getAuthToken();
    if (!token) {
      setState('error');
      return;
    }
    setState('sending');
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
        setState('error');
        return;
      }
      const data: { ok?: boolean } | null = await res.json().catch(() => null);
      setState(data && data.ok === false ? 'error' : 'done');
    } catch {
      setState('error'); // 网络/超时 → 明确报错，不自动重试
    }
  }

  // 登录态未知 或 非法商品 → 不渲染任何东西
  if (loading || !productId || productId <= 0) return null;

  // ── 未登录：只提示登录（绝不创建匿名记录）──
  if (!isLoggedIn) {
    return (
      <div className={WRAP}>
        <Link
          href="/mi-cuenta"
          className="inline-flex items-start gap-2 text-[#2563eb] font-semibold hover:underline text-sm"
        >
          <LogIn size={ICON} className="shrink-0 mt-0.5" />
          <span>Inicia sesión para recibir un aviso cuando vuelva a estar disponible.</span>
        </Link>
      </div>
    );
  }

  // ── 已登记（本次点击成功）：原地显示成功态 ──
  if (state === 'done') {
    return (
      <div className={WRAP}>
        <p className="flex items-start gap-2 text-green-700 font-semibold text-sm">
          <Check size={ICON} className="shrink-0 mt-0.5" />
          <span>Te avisaremos cuando vuelva a estar disponible.</span>
        </p>
      </div>
    );
  }

  // ── 已登录 + 缺货：Reabasteciendo + [ Avísame ] ──
  return (
    <div className={WRAP}>
      <p className="font-semibold text-amber-700 text-sm">Reabasteciendo</p>
      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'sending'}
        className={`mt-2 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-white transition px-5 h-11 text-sm ${
          state === 'sending'
            ? 'bg-gray-300 cursor-wait'
            : 'bg-[#2563eb] hover:bg-[#1d4ed8] shadow-md hover:shadow-lg'
        }`}
      >
        {state === 'sending' ? (
          <>
            <Loader2 size={ICON} className="animate-spin" /> Enviando…
          </>
        ) : (
          <>
            <Bell size={ICON} /> Avísame
          </>
        )}
      </button>
      {state === 'error' && (
        <p className="mt-2 text-red-600 text-xs">No se pudo registrar el aviso. Inténtalo de nuevo.</p>
      )}
    </div>
  );
}
