/**
 * Isola falhas do Leads Monitor para não deixar a tela em branco.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class LeadsMonitorErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[LeadsMonitor]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-800 p-6 space-y-3">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold">
            <AlertTriangle className="w-5 h-5" />
            Erro ao carregar o Nexus Leads Monitor
          </div>
          <p className="text-sm text-red-600 dark:text-red-200 font-mono break-all">
            {this.state.error.message}
          </p>
          <button
            type="button"
            className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm"
            onClick={() => this.setState({ error: null })}
          >
            Tentar novamente
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
