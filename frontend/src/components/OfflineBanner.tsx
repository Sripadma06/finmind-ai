import { useEffect, useState } from 'react'
import { WifiOffIcon } from './icons'

export default function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  if (online) return null
  return (
    <div role="alert" className="flex items-center justify-center gap-2 bg-warn-soft px-4 py-2 text-center text-sm font-medium text-warn">
      <WifiOffIcon width={18} height={18} className="shrink-0" />
      <span>You are offline. Money movements and loading will work again when you reconnect.</span>
    </div>
  )
}
