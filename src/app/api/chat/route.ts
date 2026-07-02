// 硬约束 #3: 路由隔离 - 删除此文件 = AI 完全消失, 商城不受影响
// 硬约束 #3: 数据零污染 - AI 只读 WP API, 不写任何数据
// 硬约束 #3: 隐式红线 - 不接触 checkout/payment/order/pricing
import { NextRequest, NextResponse } from 'next/server'
import { SYSTEM_PROMPT } from '@/lib/systemPrompt'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const WP_API_URL = 'https://api.gsmgc.es/wp-json'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// ── 统一用户提示 (生产安全: 禁止暴露技术细节) ──
const AI_UNAVAILABLE = 'AI assistant temporarily unavailable. Browsing, ordering, and checkout are unaffected. Please try again later.'

// ── 简易 Rate Limit (基于 IP, v0.1 版本) ──
const RATE_LIMIT_WINDOW = 60_000 // 1 分钟
const RATE_LIMIT_MAX = 20 // 每分钟最多 20 次
const rateMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

// 定期清理过期条目
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, val] of rateMap) {
      if (now > val.resetAt) rateMap.delete(key)
    }
  }, 60_000)
}

// ── 每日预算 (v0.1, 同 MVP 限制: 不跨实例共享) ──
const DAILY_LIMIT = parseInt(process.env.AI_DAILY_LIMIT || '500', 10)
let dailyCount = 0
let dailyResetAt = 0 // midnight UTC timestamp

function getTodayKey(): number {
  const d = new Date()
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function checkDailyBudget(): boolean {
  const today = getTodayKey()
  if (today !== dailyResetAt) {
    dailyResetAt = today
    dailyCount = 0
  }
  if (dailyCount >= DAILY_LIMIT) return false
  dailyCount++
  return true
}

// 每小时清理一次过期 daily key
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const today = getTodayKey()
    if (today !== dailyResetAt) {
      dailyResetAt = today
      dailyCount = 0
    }
  }, 3600_000)
}

// ── 日志 (不记录用户隐私) ──
function log(level: 'info' | 'error', msg: string, extra?: Record<string, unknown>) {
  const entry = {
    t: new Date().toISOString(),
    l: level,
    m: msg,
    ...extra,
  }
  if (level === 'error') console.error(JSON.stringify(entry))
  else console.log(JSON.stringify(entry))
}

// ── Types ──
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ProductBrief {
  id: number
  name: string
  price: string
  permalink: string
}

export async function POST(req: NextRequest) {
  const start = Date.now()

  // 1. Rate Limit
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(ip)) {
    log('info', 'rate_limited', { ip })
    return NextResponse.json({ reply: AI_UNAVAILABLE, products: [] }, { status: 429 })
  }

  // 2. Daily Budget
  if (!checkDailyBudget()) {
    log('info', 'daily_budget_exceeded', { limit: DAILY_LIMIT })
    return NextResponse.json({ reply: AI_UNAVAILABLE, products: [] }, { status: 429 })
  }

  // 2. 解析输入
  let message: string, history: ChatMessage[]
  try {
    const body = await req.json()
    message = body.message
    history = body.history || []
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  if (!message?.trim()) {
    return NextResponse.json({ error: 'empty message' }, { status: 400 })
  }

  // 3. Fallback: DeepSeek 不可用
  if (!DEEPSEEK_API_KEY) {
    log('error', 'missing_api_key')
    return NextResponse.json({ reply: AI_UNAVAILABLE, products: [] })
  }

  // 4. 先查 WP 产品 (让 AI 知道店里有什么)
  let products: ProductBrief[] = []
  try {
    const keywords = message.split(/\s+/).filter((w: string) => w.length >= 2).map((w: string) => w.toLowerCase())
    const wpController = new AbortController()
    const wpTimeout = setTimeout(() => wpController.abort(), 5_000)

    const wpRes = await fetch(`${WP_API_URL}/gsmgc/v1/products-raw`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: wpController.signal,
    })
    clearTimeout(wpTimeout)

    if (wpRes.ok) {
      const wpData = await wpRes.json()
      const allProducts = (wpData.products || []) as any[]
      // 关键词独立匹配 + 全词组优先 (避免 "Y17S" 匹配 "17" 这种噪声)
      const matched = allProducts.filter((p: any) => {
        const name = (p.name || '').toLowerCase()
        // 先试全词组匹配 (如 "iphone 17")
        const phraseHit = keywords.length >= 2 && name.includes(keywords.join(' '))
        if (phraseHit) return true
        // 单个词用词边界匹配 (数字前面必须有字母前缀如 iphone)
        return keywords.some((kw: string) => {
          if (kw.length <= 2) return false // 跳过太短的词
          // 纯数字关键词需要字母前缀
          if (/^\d+$/.test(kw)) {
            return new RegExp(`[a-z]${kw}\\b`, 'i').test(name)
          }
          return name.includes(kw)
        })
      })
      products = matched.slice(0, 3).map((p: any) => ({
        id: p.id,
        name: p.name || '',
        price: p.price || '',
        permalink: p.permalink || `https://gsmgc.es/producto/${p.id}/${p.slug || ''}`,
      }))
    }
  } catch {
    products = [] // WP 失败不影响 AI
  }

  // 5. 构建增强 System Prompt (注入真实库存数据)
  const productContext = products.length > 0
    ? `\n\nIMPORTANT: Our store actually carries these matching products:\n${products.map(p => `- ${p.name} (€${p.price})`).join('\n')}\nAlways reference real inventory. Do not claim products don't exist if they are listed above.`
    : ''

  // 6. 调 DeepSeek (15s timeout)
  const ABORT_TIMEOUT = 15_000
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), ABORT_TIMEOUT)

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT + productContext },
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
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!dsRes.ok) {
      throw new Error(`DeepSeek HTTP ${dsRes.status}`)
    }

    const dsData = await dsRes.json()
    const reply: string = dsData.choices?.[0]?.message?.content || ''
    const duration = Date.now() - start

    log('info', 'success', { duration, products: products.length })
    return NextResponse.json({ reply, products })
  } catch (err: unknown) {
    const duration = Date.now() - start
    const errorType =
      err instanceof DOMException && err.name === 'AbortError'
        ? 'deepseek_timeout'
        : err instanceof Error
          ? err.message.slice(0, 100)
          : 'unknown_error'
    log('error', 'chat_failed', { duration, error: errorType })

    // 统一错误提示, 不暴露技术细节
    return NextResponse.json({ reply: AI_UNAVAILABLE, products: [] })
  }
}
