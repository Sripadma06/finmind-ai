import { useTheme } from '../theme/ThemeContext'
import Icon from './Icon'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="grid h-10 w-10 place-items-center rounded-xl border border-line text-muted transition hover:border-brand/50 hover:bg-surface-2 hover:text-fg active:scale-95"
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}
