import type { HoldingIdentity, Holding, Transaction } from '../types'

export interface Position {
  quantity: number
  avgBuyPrice: number
  /** Cumulative realized P&L (native currency) from SELL transactions, using the moving weighted-average-cost method. */
  realizedPnl: number
}

function sortChronological(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
}

/**
 * Replays a holding's buy/sell transactions in date order to derive its current
 * quantity and moving weighted-average cost (the standard "평단가" method: a SELL
 * reduces quantity and total cost proportionally without changing the average,
 * while realizing (sellPrice - avgCostAtSaleTime) * qty).
 */
export function computePosition(transactions: Transaction[]): Position {
  let quantity = 0
  let totalCost = 0
  let realizedPnl = 0

  for (const t of sortChronological(transactions)) {
    if (t.action === 'BUY') {
      quantity += t.quantity
      totalCost += t.quantity * t.price
    } else {
      const avgCost = quantity > 0 ? totalCost / quantity : 0
      const sellQty = Math.min(t.quantity, quantity)
      realizedPnl += (t.price - avgCost) * sellQty
      totalCost -= avgCost * sellQty
      quantity -= sellQty
    }
  }

  return {
    quantity,
    avgBuyPrice: quantity > 0 ? totalCost / quantity : 0,
    realizedPnl,
  }
}

export function computeAllHoldings(identities: HoldingIdentity[], transactions: Transaction[]): Holding[] {
  return identities.map((identity) => {
    const own = transactions.filter((t) => t.holdingId === identity.id)
    const { quantity, avgBuyPrice } = computePosition(own)
    return { ...identity, quantity, avgBuyPrice }
  })
}

export function transactionsFor(transactions: Transaction[], holdingId: string): Transaction[] {
  return sortChronological(transactions.filter((t) => t.holdingId === holdingId))
}

export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
