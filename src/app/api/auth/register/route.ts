import { NextRequest, NextResponse } from 'next/server';
import { fetchWithFallbackClient } from '@/lib/fetchWithFallback';
import { parseApiResponse } from '@/lib/apiParser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ★ 三层模型：直连 → 自动降级
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

    const data = parseApiResponse(res);

    return NextResponse.json(data, {
      status: 200,
      headers: {
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
