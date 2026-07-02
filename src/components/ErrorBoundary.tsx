'use client'
// Error Boundary — AI 异常不影响页面其他部分
import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    // 静默记录, 不向用户暴露
    console.error('[ChatBubble ErrorBoundary]', error.message)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 9999,
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#9ca3af',
              color: 'white',
              border: 'none',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              opacity: 0.6,
              cursor: 'not-allowed',
            }}
            title="AI assistant unavailable"
          >
            🔧
          </div>
        )
      )
    }
    return this.props.children
  }
}
