import { Router } from 'express'
import { asyncHandler } from '../../lib/async-handler.js'
import { notFound } from '../../lib/http.js'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  productCreateSchema,
} from '../../db/repositories/products.repo.js'
import { tenant, intId } from './helpers.js'

/** Produtos e serviços (mesma tabela, coluna `kind`). Lista vazia se sem dados. */
export const productsRouter = Router()

productsRouter.get(
  '/products',
  asyncHandler(async (req, res) => {
    const q = req.query.kind
    const kind = q === 'produto' || q === 'servico' ? q : undefined
    res.json(await getProducts(tenant(req), kind))
  }),
)
productsRouter.post(
  '/products',
  asyncHandler(async (req, res) => {
    const input = productCreateSchema.parse(req.body)
    const product = await createProduct(tenant(req), input)
    res.status(201).json(product)
  }),
)
productsRouter.put(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const input = productCreateSchema.parse(req.body)
    const product = await updateProduct(tenant(req), intId(req.params.id), input)
    if (!product) throw notFound('Produto não encontrado')
    res.json(product)
  }),
)
productsRouter.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    if (!(await deleteProduct(tenant(req), intId(req.params.id))))
      throw notFound('Produto não encontrado')
    res.status(204).end()
  }),
)
