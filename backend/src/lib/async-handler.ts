import type { NextFunction, Request, Response } from 'express'

type Handler = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>

/**
 * Envolve um handler para que rejeições de Promise cheguem ao middleware de erro.
 * (No Express 4, erros assíncronos não são capturados automaticamente.)
 */
export const asyncHandler =
  (fn: Handler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }