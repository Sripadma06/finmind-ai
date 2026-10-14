import { useEffect, useState } from 'react'
import Icon from './Icon'

export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0 })} // smooth scrolling comes from CSS and is disabled for reduced motion
      aria-label="Back to top"
      className="back-top anim-pop fixed right-4 z-40 grid h-11 w-11 place-items-center rounded-full bg-brand text-brand-fg shadow-lg shadow-brand/40 transition hover:brightness-110 active:scale-95 sm:right-6"
    >
      <Icon name="arrowUp" />
    </button>
  )
}
