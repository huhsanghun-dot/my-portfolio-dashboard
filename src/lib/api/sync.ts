import type { HoldingIdentity, Snapshot, Transaction } from '../../types'
import { PRICE_SERVER_BASE_URL } from './priceServerConfig'

export interface SyncState {
  identities: HoldingIdentity[]
  transactions: Transaction[]
  snapshots: Snapshot[]
}

/** Uploads the given state as a brand-new sync code. */
export async function createSyncCode(state: SyncState): Promise<string> {
  const res = await fetch(`${PRICE_SERVER_BASE_URL}/api/sync`, {
    method: 'POST',
    body: JSON.stringify(state),
  })
  if (!res.ok) throw new Error('동기화 코드 생성 실패')
  const data = (await res.json()) as { code?: string }
  if (!data.code) throw new Error('동기화 코드 생성 실패')
  return data.code
}

/** Fetches the state stored under an existing sync code. */
export async function fetchSyncState(code: string): Promise<SyncState> {
  const res = await fetch(`${PRICE_SERVER_BASE_URL}/api/sync/${encodeURIComponent(code)}`)
  if (res.status === 404) throw new Error('존재하지 않는 동기화 코드입니다')
  if (!res.ok) throw new Error('동기화 불러오기 실패')
  return (await res.json()) as SyncState
}

/** Overwrites the state stored under an existing sync code. */
export async function pushSyncState(code: string, state: SyncState): Promise<void> {
  const res = await fetch(`${PRICE_SERVER_BASE_URL}/api/sync/${encodeURIComponent(code)}`, {
    method: 'PUT',
    body: JSON.stringify(state),
  })
  if (!res.ok) throw new Error('동기화 저장 실패')
}
