import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useClickOutside } from '@/hooks/useClickOutside'
import { Popover } from '@/components/ui'

export default function UserMenu() {
  const [open, setOpen] = useState(false)
  const userEmail = useAuthStore((s) => s.userEmail)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false))

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu do usuário"
        className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-accent text-white"
      >
        <User size={14} />
      </button>

      {open && (
        <Popover className="w-52">
          <div className="border-b border-border px-4 py-3">
            <div className="text-xs font-semibold text-ink">Admin</div>
            <div className="mt-0.5 truncate text-xs text-ink-faint" title={userEmail}>
              {userEmail || 'admin@empresa.com'}
            </div>
          </div>
          <div className="p-1">
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </Popover>
      )}
    </div>
  )
}
