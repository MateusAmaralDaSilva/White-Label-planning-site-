import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/**
 * Limite de erro (rede de segurança): captura exceções lançadas durante o render
 * dos filhos — e falhas ao carregar um chunk lazy — e mostra uma tela amigável em
 * vez de uma página em branco. Erros de rede/validação de dados já são tratados
 * por `<Async>`; isto cobre bugs de render que escapariam.
 *
 * Precisa ser class component: os hooks de erro do React (`getDerivedStateFromError`
 * / `componentDidCatch`) só existem em classes. Para reiniciar após navegar, o
 * MainLayout passa `key={pathname}` — trocar de rota remonta o boundary limpo.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Diagnóstico (em produção, trocar por um serviço de erros).
    console.error('ErrorBoundary capturou:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface px-6 py-16 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle size={20} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink">Algo deu errado nesta tela</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Tivemos um problema ao exibir este conteúdo. Tente recarregar ou volte mais tarde.
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>Recarregar</Button>
      </div>
    )
  }
}
