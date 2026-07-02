// 硬约束 #3: 路由隔离 - 删除此文件 = AI 完全消失, 商城不受影响
// 硬约束 #3: 数据零污染 - AI 只读 WP API, 不写任何数据
// 硬约束 #3: 隐式红线 - 不接触 checkout/payment/order/pricing
import { NextRequest, NextResponse } from 'next/server'
import { SYSTEM_PROMPT } from '@/lib/systemPrompt'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const WP_API_URL = 'https://api.gsmgc.es/wp-json'

export const runtime = 'edge' // Vercel Edge runtime, 0 冷启动
export const dynamic = 'force-dynamic' // 硬约束 #3: 不进 ISR cache

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ProductBrief {
  id: number
  name: string
  price: string
  permalink: string
}

export async function POST(req: NextRequest) {
  // 1. 解析输入
  const { message, history = [] } = (await req.json()) as {
    message: string
    history?: ChatMessage[]
  }
  if (!message?.trim()) {
    return NextResponse.json({ error: 'empty message' }, { status: 400 })
  }

  // 2. Fallback: DeepSeek 不可用 → 立即返回
  if (!DEEPSEEK_API_KEY) {
    return NextResponse.json({
      reply: 'Servicio no disponible temporalmente. Inténtalo de nuevo más tarde.',
      products: [],
    })
  }

  try {
    // 3. 调 DeepSeek (硬约束 #1: 镜像用户语言 - DeepSeek 自动跟随)
    const messages: ChatMessage[] = [
      { role: 'user', content: SYSTEM_PROMPT },
      ...history.slice(-4),
      { role: 'user', content: message },
    ]
    const dsRes = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.3,
        max_tokens: 600,
      }),
    })
    if (!dsRes.ok) throw new Error(`DeepSeek ${dsRes.status}`)
    const dsData = await dsRes.json()
    const reply: string = dsData.choices?.[0]?.message?.content || ''

    // 4. 调 WP products API (只读)
    let products: ProductBrief[] = []
    try {
      const searchTerm = message.split(/\s+/).slice(0, 3).join(' ').toLowerCase()
      const wpRes = await fetch(`${WP_API_URL}/gsmgc/v1/products-raw`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      })
      if (wpRes.ok) {
        const wpData = await wpRes.json()
        const allProducts = (wpData.products || []) as any[]
        // Client-side basic keyword filter
        const matched = allProducts.filter(
          (p: any) =>
            (p.name || '').toLowerCase().includes(searchTerm)
        )
        products = matched.slice(0, 3).map((p: any) => ({
          id: p.id,
          name: p.name || '',
          price: p.price || '',
          permalink: p.permalink || `https://gsmgc.es/producto/${p.id}/${p.slug || ''}`,
        }))
      }
    } catch {
      products = [] // WP 失败不影响 AI 回复
    }

    return NextResponse.json({ reply, products })
  } catch {
    return NextResponse.json({
      reply: 'Servicio no disponible temporalmente. Inténtalo de nuevo más tarde.',
      products: [],
    })
  }
}
