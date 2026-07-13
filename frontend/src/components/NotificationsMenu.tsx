import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { iconFor } from '@/lib/icons'
import type { AppNotification } from '@/config/notifications'
import { useNotificationStore, useIsUnread } from '@/store/notificationStore'
import { useClickOutside } from '@/hooks/useClickOutside'
import { IconChip, ListRow, Popover, StatusDot } from '@/components/ui'

export default function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const state = useApi<AppNotification[]>('/api/notifications')
  const notifications = state.data ?? []
  const isUnread = useIsUnread()
  const markRead = useNotificationStore((s) => s.markRead)
  const navigate = useNavigate()

  const allIds = notifications.map((n) => n.id)
  const unreadCount = notifications.reduce((n, item) => n + (isUnread(item.id) ? 1 : 0), 0)

  // Fechar marca tudo como lido (some o indicador do sino).
  const close = () => {
    markRead(allIds)
    setOpen(false)
  }
  const ref = useClickOutside<HTMLDivElement>(() => {
    if (open) close()
  })

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Notificações"
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center border-[1.5px] border-bg bg-danger px-1 text-[9px] font-bold leading-none text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <Popover className="w-80">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-xs font-semibold text-ink">Notificações</span>
            <button
              onClick={() => markRead(allIds)}
              className="text-[11px] font-medium text-accent transition-colors hover:text-accent-hover"
            >
              Marcar todas como lidas
            </button>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {state.loading && notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-ink-muted">Carregando…</div>
            ) : state.error && notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-danger">{state.error}</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-ink-muted">
                Nenhuma notificação.
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = iconFor(n.iconKey)
                const unread = isUnread(n.id)
                return (
                  <ListRow
                    key={n.id}
                    align="start"
                    className={unread ? 'bg-accent/5' : undefined}
                    leading={
                      <IconChip tone={n.tone} className="mt-0.5">
                        <Icon size={15} />
                      </IconChip>
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">{n.title}</span>
                      {unread && <StatusDot tone="accent" size="xs" />}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{n.description}</p>
                    <span className="mt-1 block text-[11px] text-ink-faint">{n.time}</span>
                  </ListRow>
                )
              })
            )}
          </div>

          <button
            onClick={() => {
              navigate('/atividades')
              close()
            }}
            className="w-full border-t border-border px-4 py-2.5 text-center text-xs font-medium text-accent transition-colors hover:bg-surface-hover"
          >
            Ver todas as atividades
          </button>
        </Popover>
      )}
    </div>
  )
}
