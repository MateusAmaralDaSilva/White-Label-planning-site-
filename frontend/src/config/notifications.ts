/**
 * Tipo das notificações do sino (topbar). Os DADOS vêm do backend:
 * GET /api/notifications. O ícone chega como `iconKey` textual (resolvido por
 * lib/icons.ts). O estado de "lida" é controlado à parte pelo
 * `notificationStore` (persistido no navegador).
 */
import type { AppNotification } from '@contracts'
export type { AppNotification }
