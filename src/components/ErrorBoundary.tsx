import { Component, type ErrorInfo, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[nexus]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="nexus-card p-6 m-4 space-y-3">
          <h2 className="font-bold text-lg">Não foi possível carregar esta tela</h2>
          <p className="text-sm" style={{ color: 'var(--code-muted)' }}>{this.state.error.message}</p>
          <button type="button" className="nexus-cta text-white rounded-lg px-3 py-2 text-sm font-semibold" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
