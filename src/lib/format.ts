export function formatKRW(value: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(
    value,
  )
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(
    value,
  )
}

export function formatNumber(value: number, maxFractionDigits = 4): string {
  return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: maxFractionDigits }).format(value)
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatTime(ts: number | null): string {
  if (!ts) return '-'
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(
    new Date(ts),
  )
}

export function formatDateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${m}/${d}`
}
