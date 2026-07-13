import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Guarda os ids de notificações já lidas (persistido no navegador). Notificações
 * novas — cujo id ainda não está aqui — contam como não lidas e acendem o
 * indicador do sino. A LISTA vem do backend (GET /api/notifications); este store
 * cuida só do estado de leitura, que é local ao usuário/navegador.
 */
interface NotificationState {
  readIds: string[]
  markRead: (ids: string[]) => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      readIds: [],
      markRead: (ids) =>
        set((state) => ({ readIds: [...new Set([...state.readIds, ...ids])] })),
    }),
    { name: 'whitelabel-notifications' },
  ),
)

/** Regra única: uma notificação é "não lida" quando seu id não está em readIds. */
const isUnreadIn = (readIds: string[], id: string) => !readIds.includes(id)

/**
 * Predicado por-item para "não lida". O contador do sino é derivado no
 * NotificationsMenu (que busca a lista) aplicando este predicado sobre os ids.
 */
export const useIsUnread = () => {
  const readIds = useNotificationStore((s) => s.readIds)
  return (id: string) => isUnreadIn(readIds, id)
}
