import { NextResponse } from 'next/server';

// ★ DoD B（2026-08-27）：服务端清除 gsmgc_auth httpOnly cookie（客户端无法删除 httpOnly）
export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set('gsmgc_auth', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
