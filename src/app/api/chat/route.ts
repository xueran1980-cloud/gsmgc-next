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

  // 输入规范化: "hua wei" → "huawei", "iphone17" → "iphone 17"
  const normalizedMessage = message
    .replace(/([a-z])(\d)/gi, '$1 $2')     // iphone17 → iphone 17
    .replace(/(\d)(pro|max|ultra|plus|air|lite|mini)/gi, '$1 $2')
    .replace(/hua\s+wei/gi, 'huawei')
    .replace(/sam\s+sung/gi, 'samsung')
  const normalizedAllText = allText
    .replace(/([a-z])(\d)/gi, '$1 $2')
    .replace(/(\d)(pro|max|ultra|plus|air|lite|mini)/gi, '$1 $2')
    .replace(/hua\s+wei/gi, 'huawei')
    .replace(/sam\s+sung/gi, 'samsung')
  // 品牌名检测 + 意图 (维修优先于商品)
  const isBrandOnly = /^(iphone|huawei|samsung|xiaomi|oneplus|oppo|vivo|pixel|motorola|nokia|sony|lg|ipad|galaxy)(\s|$)/i.test(normalizedMessage.trim())
  const isRepairQuery = /坏|不开机|黑屏|碎了|碎屏|crack|充不进|进水|不开|不充电|不显示|花屏|白屏|摔|broken|won['']t|doesn['']t|no carga|no enciende|pantalla.*neg|calient|distor|falla|no funciona|怎么换|怎么修|更换|拆|教程|安装|换屏|自己换/i.test(normalizedAllText)
  const isProductQuery = (/有货|库存|多少钱|价格|有没有|有吗|找|买|链接|购买|下单|吗$|cu[aá]nto|precio|disponible|tienes|SKU|sku|compatible|comprar/i.test(normalizedAllText)
    || isBrandOnly) && !isRepairQuery
  const isAfterSales = /发货|物流|多久|保修|garant[ií]a|退|换|env[ií]o|cu[aá]ndo|plazo|shipping|delivery|return|warranty/i.test(normalizedAllText)
  const isTechnical = /点位|IC\b|芯片|排线.*型号|JCID|ZXW|图纸|datasheet|schematic|pinout|connector.*type|规格|specification/i.test(normalizedAllText)

  // 4. 先查 WP 产品 (从对话历史提取产品上下文)
  let products: ProductBrief[] = []
  let modelKeywords: string[] = [] // 声明在外层, 供意图判断使用
  try {
    // 触发词 — 出现任一字眼就必须查 WP
    const triggerWords = /有货|库存|多少钱|价格|兼容|有没有|货|SKU|sku|price|stock|disponible|precio|model|tienes|cu[aá]nto|compatible/i

    // 从当前消息 + 全部历史用户消息提取关键词
    const allUserMessages = [
      normalizedMessage,
      ...history.filter((m: ChatMessage) => m.role === 'user').map((m: ChatMessage) => m.content)
    ].join(' ')

    const rawKeywords = allUserMessages.split(/\s+/).filter((w: string) => w.length >= 2).map((w: string) => w.toLowerCase())

    const brands = ['iphone','ipad','samsung','galaxy','huawei','xiaomi','motorola','oneplus','oppo','vivo','pixel','nokia','sony','lg','realme','honor','zte','lenovo']
    modelKeywords = []
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

    const shouldSearch = isProductQuery || isRepairQuery || triggerWords.test(allUserMessages) || modelKeywords.length > 0

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

      // ── 3 级搜索 (Evidence Gate) ──
      let matched: any[] = []

      // Tier 1: 精确品牌+数字对 (如 "iphone 13")
      if (modelKeywords.length >= 2) {
        matched = allProducts.filter((p: any) => {
          const name = (p.name || '').toLowerCase()
          return keywords.some((_kw, i) => {
            if (i + 1 >= keywords.length) return false
            return name.includes(`${keywords[i]} ${keywords[i + 1]}`)
          })
        })
        // 精确型号过滤: "iphone 12" 不应返回 "iphone 12 pro max"
        if (matched.length > 0 && modelKeywords.length === 2) {
          const [brand, num] = modelKeywords
          const variants = ['pro', 'max', 'mini', 'plus', 'ultra', 'air', 'lite']
          const hasVariantKeyword = rawKeywords.some((k: string) => variants.includes(k))
          if (!hasVariantKeyword) {
            const exactMatched = matched.filter((p: any) => {
              const name = (p.name || '').toLowerCase()
              const afterModel = name.split(`${brand} ${num}`)[1] || ''
              return !variants.some(v => afterModel.trimStart().startsWith(v))
            })
            if (exactMatched.length > 0) matched = exactMatched
          }
        }
      }

      // Tier 2: 规范化尝试 (如 "iphone17" 的 rawKeyword 包含品牌名, 尝试分离)
      if (matched.length === 0) {
        const joinedNumbers = normalizedAllText.match(/([a-z]+)(\d+)/gi)
        if (joinedNumbers) {
          const splitTerms = joinedNumbers.flatMap(t => {
            const m = t.match(/([a-z]+)(\d+)/i)
            return m ? [m[1], m[2]] : [t]
          })
          matched = allProducts.filter((p: any) => {
            const name = (p.name || '').toLowerCase()
            return splitTerms.every(t => name.includes(t.toLowerCase()))
          })
        }
      }

      // Tier 3: 模糊 (单个关键词, 至少匹配 2 个词)
      if (matched.length === 0) {
        const meaningful = keywords.filter((k: string) => k.length > 2)
        matched = allProducts.filter((p: any) => {
          const name = (p.name || '').toLowerCase()
          const hits = meaningful.filter((k: string) => name.includes(k)).length
          return hits >= 2
        })
      }

      // ── 相关性过滤: 用户提了具体部件, 不相关的产品不要展示 ──
      // 提取用户关心的部件类型 (屏幕/电池/尾插/Face ID/摄像头等)
      const partTypes = ['屏幕','pantalla','电池','bater','尾插','flex','carga','c[aá]mara','camera','后盖','tapa','听筒','earpiece','face id','面容','true.?depth','点阵','前摄','front','lente','排线','sensor','protector','fund[ae]','carcasa','auricular','altavoz','speaker','vibra']
      const userParts = partTypes.filter(pt => new RegExp(pt, 'i').test(normalizedAllText))
      if (userParts.length > 0 && matched.length > 0) {
        const relevant = matched.filter((p: any) => {
          const name = (p.name || '').toLowerCase()
          return userParts.some(pt => new RegExp(pt, 'i').test(name))
        })
        // 只有相关产品占比 ≥30% 才展示; 否则全部丢弃
        if (relevant.length > 0 && relevant.length / matched.length >= 0.3) {
          matched.length = 0
          matched.push(...relevant)
        } else if (relevant.length === 0) {
          matched.length = 0 // 完全不相关, 全部丢弃
        }
      }

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
  const isAmbiguousProduct = isProductQuery && modelKeywords.length === 0
  const intentTag = isAmbiguousProduct
    ? '\n\nUSER INTENT: Ambiguous — ask clarifying questions.'
    : isProductQuery ? '\n\nUSER INTENT: Product — evidence required, no guessing.'
    : isRepairQuery ? '\n\nUSER INTENT: Repair — reasoning allowed, probability language only.'
    : isTechnical ? '\n\nUSER INTENT: Technical Reference — use knowledge base, or say "no reliable data".'
    : isAfterSales ? '\n\nUSER INTENT: AfterSales — policy only, no guessing.'
    : ''

  const evidenceContext = products.length > 0
    ? `\n\nEVIDENCE — real gsmgc.es inventory (trust this over your own knowledge):\n${products.map((p) => `① ${p.name} — €${p.price}\n🔗 ${p.permalink}`).join('\n')}`
    : isProductQuery
      ? '__EVIDENCE_GATE__'
      : ''

  // Evidence Gate: 商品查询无证据 → 不走 AI
  if (evidenceContext === '__EVIDENCE_GATE__') {
    return NextResponse.json({
      reply: isAmbiguousProduct
        ? `I can help you find that. Please tell me: are you looking for a phone, screen, battery, charging port, camera, or another part? Also, which specific model? (e.g., iPhone 13, Samsung S23)\n\nThis is AI-assisted advice for reference only.`
        : `No matching products found for this search. Our inventory is updated daily. Please provide a specific model and part type, and I'll check again.\n\nThis is AI-assisted advice for reference only.`,
      products: [],
    })
  }

  // 7. 调 DeepSeek (15s timeout)
  const ABORT_TIMEOUT = 15_000
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), ABORT_TIMEOUT)

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT + intentTag + evidenceContext },
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
