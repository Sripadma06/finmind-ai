export function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value)
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}
