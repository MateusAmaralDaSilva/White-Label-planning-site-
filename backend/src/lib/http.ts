/** Erro HTTP com status — capturado pelo middleware de erro. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export const badRequest = (msg = 'Requisição inválida') => new HttpError(400, msg)
export const unauthorized = (msg = 'Não autenticado') => new HttpError(401, msg)
export const forbidden = (msg = 'Acesso negado') => new HttpError(403, msg)
export const notFound = (msg = 'Não encontrado') => new HttpError(404, msg)
/** 402: assinatura do tenant expirada — o front redireciona para a renovação. */
export const paymentRequired = (msg = 'Assinatura expirada') => new HttpError(402, msg)
/** 409: conflito (ex.: tenant/e-mail já existe ao provisionar conta). */
export const conflict = (msg = 'Conflito') => new HttpError(409, msg)
/** 429: excesso de requisições (ex.: brute force no login). */
export const tooManyRequests = (msg = 'Muitas tentativas') => new HttpError(429, msg)