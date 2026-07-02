'use client'
// 硬约束 #3: UI 隔离 - 删除此组件 = AI 完全消失
// 硬约束 #3: 数据零污染 - 纯前端组件, 不写任何存储
// 硬约束 #3: 隐式红线 - 不挂在 checkout/payment 页面
import { useState, useRef, useEffect, useCallback } from 'react'

interface Product {
  id: number
  name: string
  price: string
  permalink: string
}

interface Message {
  role: 'user' | 'ai'
  text: string
  products?: Product[]
}

export default function ChatBubble() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, loading])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text }])
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
        }),
      })
      const data = await res.json()
      setMessages((m) => [
        ...m,
        { role: 'ai', text: data.reply || '...', products: data.products },
      ])
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'ai',
          text: 'Error de conexión. Inténtalo de nuevo.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          fontSize: 24,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente de reparación'}
      >
        {open ? '✕' : '🔧'}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 92,
            right: 24,
            zIndex: 9998,
            width: 360,
            maxWidth: 'calc(100vw - 40px)',
            height: 520,
            maxHeight: 'calc(100vh - 140px)',
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              background: '#2563eb',
              color: 'white',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            🔧 Asistente de reparación
          </div>

          {/* Messages area */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 12,
              background: '#f9fafb',
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  color: '#6b7280',
                  fontSize: 14,
                  padding: 16,
                  lineHeight: 1.6,
                }}
              >
                Pregunta sobre reparación de móviles o tablets.
                Respondo en tu idioma.
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 10,
                  textAlign: m.role === 'user' ? 'right' : 'left',
                }}
              >
                <div
                  style={{
                    display: 'inline-block',
                    maxWidth: '85%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: m.role === 'user' ? '#2563eb' : 'white',
                    color: m.role === 'user' ? 'white' : '#111',
                    whiteSpace: 'pre-wrap',
                    fontSize: 14,
                    lineHeight: 1.5,
                    border:
                      m.role === 'ai' ? '1px solid #e5e7eb' : 'none',
                    textAlign: 'left',
                  }}
                >
                  {m.text}
                </div>
                {m.products && m.products.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    {m.products.map((p) => (
                      <a
                        key={p.id}
                        href={p.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'block',
                          color: '#2563eb',
                          textDecoration: 'none',
                          padding: '2px 0',
                        }}
                      >
                        • {p.name}
                        {p.price ? ` — ${p.price}€` : ''}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div
                style={{
                  color: '#6b7280',
                  fontSize: 14,
                  padding: '4px 0',
                }}
              >
                Pensando...
              </div>
            )}
          </div>

          {/* Input area */}
          <div
            style={{
              padding: 10,
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: 8,
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Describe tu problema..."
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14,
                outline: 'none',
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                padding: '8px 16px',
                background: loading ? '#93c5fd' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {loading ? '...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
