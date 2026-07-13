import type { NextFunction, Request, Response } from 'express'
import { tooManyRequests } from './http.js'

/**
 * Rate-limiter simples em memória (janela fixa por chave). Freia brute force no
 * login sem depender de biblioteca externa nem de infraestrutura.
 *
 * Limitações conscientes:
 *   • O estado é POR INSTÂNCIA. Com várias instâncias da API, cada uma conta em
 *     separado (mesma limitação do store em memória padrão das libs do gênero).
 *     Para escala horizontal, trocar por um store compartilhado (ex.: Redis).
 *   • A chave padrão é o IP (`req.ip`). Atrás de um proxy reverso, configure
 *     `TRUST_PROXY` para que `req.ip` seja o do cliente e não o do proxy — senão
 *     todos caem no mesmo balde. Ver src/index.ts.
 *
 * Chaveia por IP (e não por e-mail) de propósito: chavear por e-mail deixaria um
 * atacante trancar a conta de uma vítima só disparando tentativas no e-mail dela.
 */
interface Bucket {
  count: number
  /** Epoch (ms) em que a janela zera. */
  resetAt: number
}

export interface RateLimitOptions {
  /** Tamanho da janela, em ms. */
  windowMs: number
  /** Máximo de requisições permitidas por chave dentro da janela. */
  max: number
  /** Deriva a chave da requisição (padrão: o IP). */
  keyOf?: (req: Request) => string
  /** Mensagem do 429. */
  message?: string
}

export function rateLimit(opts: RateLimitOptions) {
  const {
    windowMs,
    max,
    keyOf = (req) => req.ip ?? 'unknown',
    message = 'Muitas tentativas. Tente novamente em alguns minutos.',
  } = opts

  const buckets = new Map<string, Bucket>()
  let lastSweep = 0

  return (req: Request, _res: Response, next: NextFunction): void => {
    const now = Date.now()

    // Varredura preguiçosa: a cada janela, remove os baldes já expirados para o
    // Map não crescer sem limite com IPs que não voltam. Sem timer/setInterval.
    if (now - lastSweep > windowMs) {
      for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k)
      lastSweep = now
    }

    const key = keyOf(req)
    const bucket = buckets.get(key)

    if (!bucket || now >= bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    bucket.count += 1
    if (bucket.count > max) {
      throw tooManyRequests(message)
    }
    next()
  }
}
