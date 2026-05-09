import { NextRequest, NextResponse } from 'next/server';
import { fetchWithFallbackClient } from '@/lib/fetchWithFallback';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ★ 直连 → 自动降级，透传后端原始响应
    const res = await fetchWithFallbackClient(
      'https://api.gsmgc.es/wp-json/gsmgc/v1/register',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'GSMGC-Next-Direct/1.0',
        },
        body: JSON.stringify(body),
      }
    );

    // 透传后端响应体和状态码，不包装
    const backendData = await res.text();
    return new NextResponse(backendData, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[API /auth/register] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Register failed', error: err.message },
      { status: 500 }
    );
  }
}
