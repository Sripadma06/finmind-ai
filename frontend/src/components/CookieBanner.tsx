import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from './ui'

const KEY = 'finmind.notice-accepted'

function alreadyAccepted(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export default function CookieBanner() {
  const [open, setOpen] = useState(() => !alreadyAccepted())

  // Lets the stylesheet lift the back-to-top button above the banner on small screens.
  useEffect(() => {
    if (open) document.documentElement.dataset.banner = '1'
    else delete document.documentElement.dataset.banner
    return () => {
      delete document.documentElement.dataset.banner
    }
  }, [open])

  if (!open) return null

  function accept() {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* if storage is blocked the banner simply shows again next visit */
    }
    setOpen(false)
  }

  return (
    <div
      role="region"
      aria-label="Storage notice"
      className="anim-pop fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-line bg-surface p-4 shadow-2xl shadow-black/30 sm:right-auto sm:max-w-sm"
    >
      <p className="text-sm text-muted">
        FinMind stores your sign-in and theme in this browser so you stay signed in. No ads, no tracking.{' '}
        <Link to="/privacy" className="font-medium text-brand-text underline-offset-2 hover:underline">
          What we store
        </Link>
      </p>
      <Button onClick={accept} className="mt-3 w-full sm:w-auto">
        Got it
      </Button>
    </div>
  )
}
