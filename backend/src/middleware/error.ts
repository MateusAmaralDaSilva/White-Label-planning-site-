import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { HttpError } from '../lib/http.js'

/** 404 para rotas não mapeadas. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Rota não encontrada' })
}

/** Handler de erro central. Traduz HttpError e ZodError em respostas JSON. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // O Express só reconhece um handler de erro pela aridade 4 — `next` é obrigatório.
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Dados inválidos', issues: err.issues })
    return
  }

  console.error('[erro não tratado]', err)
  res.status(500).json({ error: 'Erro interno do servidor' })
}