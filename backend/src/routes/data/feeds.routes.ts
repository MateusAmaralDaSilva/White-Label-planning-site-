import { Router } from 'express'
import { asyncHandler } from '../../lib/async-handler.js'
import { getNews } from '../../db/repositories/news.repo.js'
import { getActivity } from '../../db/repositories/activity.repo.js'
import { getNotifications } from '../../db/repositories/notifications.repo.js'
import { tenant } from './helpers.js'

/** Feeds de leitura: Home (notícias), Atividades/Dashboard e sino da topbar. */
export const feedsRouter = Router()

// Home → feed de notícias.
feedsRouter.get('/news', asyncHandler(async (req, res) => res.json(await getNews(tenant(req)))))

// Atividades + mini-feed do Dashboard.
feedsRouter.get(
  '/activity',
  asyncHandler(async (req, res) => res.json(await getActivity(tenant(req)))),
)

// Sino da topbar.
feedsRouter.get(
  '/notifications',
  asyncHandler(async (req, res) => res.json(await getNotifications(tenant(req)))),
)
