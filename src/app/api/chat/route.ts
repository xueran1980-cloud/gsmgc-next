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

  // 3. Intent Classification (规则, 不走 AI)
  const allText = [message, ...history.filter((m: ChatMessage) => m.role === 'user').map((m: ChatMessage) => m.content)].join(' ')
  const isProductQuery = /有货|库存|多少钱|价格|有没有|有吗|货\b|买|链接|购买|下单|吗$|cu[aá]nto|precio|disponible|tienes|SKU|sku|compatible|comprar/i.test(allText)
  const isRepairQuery = /坏|不开机|黑屏|碎了|碎屏|crack|充不进|进水|不开|不充电|不显示|花屏|白屏|摔|broken|won['']t|doesn['']t|no carga|no enciende|pantalla.*neg|calient|distor|falla|no funciona/i.test(allText)
  const isComparison = /哪个好|区别|差别|比较|vs|对比|推荐|建议|mejor|cual|cu[aá]l|diferencia|recomiend/i.test(allText)
  const isAfterSales = /发货|物流|多久|保修|garant[ií]a|退|换|env[ií]o|cu[aá]ndo|plazo|shipping|delivery|return|warranty/i.test(allText)

  // 4. 先查 WP 产品 (从对话历史提取产品上下文)
  let products: ProductBrief[] = []
  try {
    // 触发词 — 出现任一字眼就必须查 WP
    const triggerWords = /有货|库存|多少钱|价格|兼容|有没有|货|SKU|sku|price|stock|disponible|precio|model|tienes|cu[aá]nto|compatible/i

    // 从当前消息 + 全部历史用户消息提取关键词
    const allUserMessages = [
      message,
      ...history.filter((m: ChatMessage) => m.role === 'user').map((m: ChatMessage) => m.content)
    ].join(' ')

    const rawKeywords = allUserMessages.split(/\s+/).filter((w: string) => w.length >= 2).map((w: string) => w.toLowerCase())

    // 品牌+数字检测 (从原始关键词提取, 比 regex 更灵活)
    const brands = ['iphone','ipad','samsung','galaxy','huawei','xiaomi','motorola','oneplus','oppo','vivo','pixel','nokia','sony','lg','realme','honor','zte','lenovo']
    const modelKeywords: string[] = []
    for (let i = 0; i < rawKeywords.length; i++) {
      if (brands.includes(rawKeywords[i]) && i + 1 < rawKeywords.length) {
        const next = rawKeywords[i + 1]
        // 数字或型号后缀
        if (/^\d+$/.test(next) || /^(pro|max|ultra|plus|air|lite|mini|5g|edge|neo)$/i.test(next)) {
          modelKeywords.push(rawKeywords[i], next)
        }
      }
    }

    // 补充: 用原始 regex 匹配品牌+零件组合
    const partPattern = /(?:iphone|ipad|samsung|galaxy|huawei|xiaomi|motorola|oneplus|oppo|vivo|pixel|nokia|sony)\s*[\d\w\s\/]*(?:pro|max|ultra|plus|air|lite|mini|5g|edge|neo)?(?:\s+(?:屏幕|pantalla|电池|bater[ií]a|充电|carga|c[aá]mara|camera|后盖|tapa|尾插|flex|carcasa|fund[ae]|protector|lente))/gi
    const partMatches = allUserMessages.match(partPattern)
    if (partMatches) {
      for (const m of partMatches) {
        modelKeywords.push(...m.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 2))
      }
    }

    // 最终关键词
    const keywords = [...new Set([...modelKeywords, ...rawKeywords])]

    const shouldSearch = isProductQuery || triggerWords.test(allUserMessages) || modelKeywords.length > 0

    if (shouldSearch) {
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
      const matched = allProducts.filter((p: any) => {
        const name = (p.name || '').toLowerCase()
        // 如果有模型关键词, 必须匹配品牌+数字对 (如 "iphone 13"), 否则会返回所有 iPhone
        if (modelKeywords.length >= 2) {
          return keywords.some((_kw, i) => {
            if (i + 1 >= keywords.length) return false
            const pair = `${keywords[i]} ${keywords[i + 1]}`
            return name.includes(pair)
          })
        }
        // 无模型关键词时用单关键词匹配
        return keywords.some((kw: string) => {
          if (kw.length <= 2) return false
          if (/^\d+$/.test(kw)) return new RegExp(`[a-z]${kw}\\b`, 'i').test(name)
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
    } // shouldSearch
  } catch {
    products = [] // WP 失败不影响 AI
  }

  // 5. Fallback: DeepSeek 不可用
  if (!DEEPSEEK_API_KEY) {
    log('error', 'missing_api_key')
    return NextResponse.json({ reply: AI_UNAVAILABLE, products: [] })
  }

  // 6. 构建增强 System Prompt (注入意图 + 库存)
  const intentTag = isProductQuery ? '\n\nUSER INTENT: Product shopping. List what we have. Do NOT give repair causes.'
    : isRepairQuery ? '\n\nUSER INTENT: Repair diagnosis. Give likely cause, ask one question. Be brief.'
    : isComparison ? '\n\nUSER INTENT: Comparison. Compare options in 1-2 sentences. Ask what matters most.'
    : isAfterSales ? '\n\nUSER INTENT: After-sales. Answer directly about shipping/warranty/returns.'
    : ''

  const productContext = products.length > 0
    ? `\n\nSTORE INVENTORY — real products at gsmgc.es (use these exact names, prices, and links):\n${products.map((p) => `① ${p.name} — €${p.price}\n🔗 ${p.permalink}`).join('\n')}`
    : isProductQuery
      ? '\n\nSTORE INVENTORY: Currently empty for this search. Follow the "no inventory" product template. Do NOT invent products or suggest other stores.'
      : ''

  // 7. 调 DeepSeek (15s timeout)
  const ABORT_TIMEOUT = 15_000
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), ABORT_TIMEOUT)

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT + intentTag + productContext },
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
