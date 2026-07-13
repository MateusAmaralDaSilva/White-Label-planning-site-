import { Router } from 'express'
import { asyncHandler } from '../../lib/async-handler.js'
import { notFound } from '../../lib/http.js'
import {
  getDashboard,
  createTask,
  updateTask,
  deleteTask,
  taskCreateSchema,
  taskUpdateSchema,
} from '../../db/repositories/dashboard.repo.js'
import { tenant, intId } from './helpers.js'

/** Dashboard (stats + tarefas). O objeto único retorna 404 se não existir. */
export const dashboardRouter = Router()

dashboardRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const dashboard = await getDashboard(tenant(req))
    if (!dashboard) throw notFound('Dashboard não encontrado para o tenant')
    res.json(dashboard)
  }),
)
dashboardRouter.post(
  '/dashboard/tasks',
  asyncHandler(async (req, res) => {
    const input = taskCreateSchema.parse(req.body)
    const task = await createTask(tenant(req), input)
    res.status(201).json(task)
  }),
)
dashboardRouter.put(
  '/dashboard/tasks/:id',
  asyncHandler(async (req, res) => {
    const patch = taskUpdateSchema.parse(req.body)
    const task = await updateTask(tenant(req), intId(req.params.id), patch)
    if (!task) throw notFound('Tarefa não encontrada')
    res.json(task)
  }),
)
dashboardRouter.delete(
  '/dashboard/tasks/:id',
  asyncHandler(async (req, res) => {
    if (!(await deleteTask(tenant(req), intId(req.params.id))))
      throw notFound('Tarefa não encontrada')
    res.status(204).end()
  }),
)
