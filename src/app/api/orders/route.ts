/**
 * GET /api/orders
 * 获取客户历史订单（直连 → 自动降级，透传后端响应）
 */
import { NextRequest, NextResponse } from 'next/server';
import { fetchWithFallbackClient } from '@/lib/fetchWithFallback';

export async function GET(request: NextRequest) {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'GSMGC-Next.js/1.0',
      'Accept': 'application/json',
    };

    // ★ 透传 token
    const authHeader = request.headers.get('Authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const res = await fetchWithFallbackClient(
      'https://api.gsmgc.es/wp-json/gsmgc/v1/my-orders',
      {
        method: 'GET',
        headers,
      }
    );

    // 透传后端响应体和状态码
    const backendData = await res.text();
    return new NextResponse(backendData, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[API /orders] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
