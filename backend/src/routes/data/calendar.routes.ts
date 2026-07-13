import { Router } from 'express'
import { asyncHandler } from '../../lib/async-handler.js'
import { notFound } from '../../lib/http.js'
import {
  getCalendars,
  createCalendar,
  updateCalendar,
  deleteCalendar,
  calendarCreateSchema,
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  eventCreateSchema,
} from '../../db/repositories/calendar.repo.js'
import { tenant, uid } from './helpers.js'

/** Agendas (calendários nomeados) e seus eventos; visibilidade por usuário. */
export const calendarRouter = Router()

// ── Agendas (calendários nomeados) visíveis ao usuário ────────────────────────
calendarRouter.get(
  '/calendar/calendars',
  asyncHandler(async (req, res) => res.json(await getCalendars(tenant(req), uid(req)))),
)
calendarRouter.post(
  '/calendar/calendars',
  asyncHandler(async (req, res) => {
    const input = calendarCreateSchema.parse(req.body)
    const calendar = await createCalendar(tenant(req), uid(req), input)
    res.status(201).json(calendar)
  }),
)
calendarRouter.put(
  '/calendar/calendars/:id',
  asyncHandler(async (req, res) => {
    const input = calendarCreateSchema.parse(req.body)
    const calendar = await updateCalendar(tenant(req), uid(req), req.params.id, input)
    if (!calendar) throw notFound('Agenda não encontrada')
    res.json(calendar)
  }),
)
calendarRouter.delete(
  '/calendar/calendars/:id',
  asyncHandler(async (req, res) => {
    if (!(await deleteCalendar(tenant(req), uid(req), req.params.id)))
      throw notFound('Agenda não encontrada')
    res.status(204).end()
  }),
)

// ── Eventos das agendas ───────────────────────────────────────────────────────
calendarRouter.get(
  '/calendar/events',
  asyncHandler(async (req, res) => res.json(await getCalendarEvents(tenant(req), uid(req)))),
)
calendarRouter.post(
  '/calendar/events',
  asyncHandler(async (req, res) => {
    const input = eventCreateSchema.parse(req.body)
    const event = await createCalendarEvent(tenant(req), uid(req), input)
    if (!event) throw notFound('Agenda não encontrada')
    res.status(201).json(event)
  }),
)
calendarRouter.put(
  '/calendar/events/:id',
  asyncHandler(async (req, res) => {
    const input = eventCreateSchema.parse(req.body)
    const event = await updateCalendarEvent(tenant(req), uid(req), req.params.id, input)
    if (!event) throw notFound('Agendamento não encontrado')
    res.json(event)
  }),
)
calendarRouter.delete(
  '/calendar/events/:id',
  asyncHandler(async (req, res) => {
    if (!(await deleteCalendarEvent(tenant(req), uid(req), req.params.id)))
      throw notFound('Agendamento não encontrado')
    res.status(204).end()
  }),
)
