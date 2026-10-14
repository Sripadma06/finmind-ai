import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './ui'
import Icon from './Icon'

/** Last line of defence: a rendering bug shows a recovery screen instead of a blank page. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <Icon name="alert" className="h-10 w-10 text-expense" />
        <h1 className="text-xl font-bold">Something broke on this page</h1>
        <p className="text-sm text-muted">
          Your data is safe. Reload to try again. If it keeps happening, the details are in the browser console.
        </p>
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      </div>
    )
  }
}
