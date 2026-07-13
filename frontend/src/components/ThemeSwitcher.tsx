import { useState } from 'react'
import { Check } from 'lucide-react'
import { themeRegistry, getTheme } from '@/config/themes'
import { useThemeStore } from '@/store/themeStore'
import { useClickOutside } from '@/hooks/useClickOutside'
import { Popover } from '@/components/ui'
import { cn } from '@/lib/cn'

/**
 * Theme picker driven entirely by the theme registry — add a theme in
 * src/config/themes.ts and it shows up here automatically.
 */
export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false)
  const themeId = useThemeStore((s) => s.themeId)
  const setTheme = useThemeStore((s) => s.setTheme)
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false))

  const current = getTheme(themeId)
  const CurrentIcon = current.icon

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Trocar tema"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <CurrentIcon size={16} />
      </button>

      {open && (
        <Popover className="w-44 p-1">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Tema
          </div>
          {themeRegistry.map((theme) => {
            const Icon = theme.icon
            const active = theme.id === themeId
            return (
              <button
                key={theme.id}
                onClick={() => {
                  setTheme(theme.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-surface text-ink'
                    : 'text-ink-muted hover:bg-surface-hover hover:text-ink',
                )}
              >
                <Icon size={15} />
                <span className="flex-1 text-left">{theme.name}</span>
                {active && <Check size={14} className="text-accent" />}
              </button>
            )
          })}
        </Popover>
      )}
    </div>
  )
}
