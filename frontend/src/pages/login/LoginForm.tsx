import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Brand, Button, Field, Input, PasswordInput } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { ApiError } from '@/lib/api'

/** Painel do formulário de login (e-mail + senha) com a lógica de autenticação. */
export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 4) {
      setError('A senha deve ter pelo menos 4 caracteres.')
      return
    }
    setLoading(true)
    try {
      const ok = await login(email, password)
      if (ok) {
        // Admin de plataforma vai direto para o painel de contas.
        const isAdmin = useAuthStore.getState().user?.isPlatformAdmin ?? false
        navigate(isAdmin ? '/admin' : '/')
      } else {
        // login() só devolve false em 401 → credenciais realmente inválidas.
        setError('Credenciais inválidas. Tente novamente.')
      }
    } catch (e) {
      // API fora do ar (status 0) ou erro de servidor (5xx): mostra a causa real
      // em vez de mascarar como "senha errada".
      setError(
        e instanceof ApiError
          ? e.message
          : 'Erro inesperado ao entrar. Tente novamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  const invalid = !!error
  const describedBy = error ? 'login-error' : undefined

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-[340px]">
        <Brand className="mb-9 lg:hidden" />

        <h1 className="mb-1.5 text-2xl font-bold text-ink">Bem-vindo de volta</h1>
        <p className="mb-7 text-sm text-ink-muted">
          Entre com suas credenciais para acessar o painel
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Field label="E-mail" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@empresa.com"
              autoComplete="email"
              aria-invalid={invalid}
              aria-describedby={describedBy}
            />
          </Field>

          <Field
            label="Senha"
            htmlFor="password"
            action={
              <button type="button" className="text-xs text-accent hover:text-accent-hover">
                Esqueci a senha
              </button>
            }
          >
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={invalid}
              aria-describedby={describedBy}
            />
          </Field>

          {error && (
            <div
              id="login-error"
              role="alert"
              className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Entrar
            <ArrowRight size={15} />
          </Button>
        </form>

        <p className="mt-7 text-center text-xs text-ink-faint">
          Não tem uma conta?{' '}
          <a href="#planos" className="text-accent hover:text-accent-hover">
            Conheça os planos
          </a>
        </p>
      </div>
    </main>
  )
}
