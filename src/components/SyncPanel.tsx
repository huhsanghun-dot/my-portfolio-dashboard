import { useState } from 'react'
import type { SyncStatus } from '../hooks/usePortfolio'

interface Props {
  syncCode: string | null
  syncStatus: SyncStatus
  syncError: string | null
  onCreate: () => Promise<string>
  onLink: (code: string) => Promise<void>
  onUnlink: () => void
}

const STATUS_LABEL: Record<SyncStatus, string> = {
  idle: '',
  syncing: '동기화 중...',
  synced: '동기화됨',
  error: '동기화 오류',
}

export function SyncPanel({ syncCode, syncStatus, syncError, onCreate, onLink, onUnlink }: Props) {
  const [open, setOpen] = useState(false)
  const [codeDraft, setCodeDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [copyHint, setCopyHint] = useState<string | null>(null)

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyHint(`${label} 복사됨`)
      setTimeout(() => setCopyHint(null), 1500)
    } catch {
      setCopyHint('복사 실패, 직접 선택해주세요')
    }
  }

  const handleCreate = async () => {
    setBusy(true)
    try {
      await onCreate()
    } catch {
      // surfaced via syncError
    } finally {
      setBusy(false)
    }
  }

  const handleLink = async () => {
    if (!codeDraft.trim()) return
    setBusy(true)
    try {
      await onLink(codeDraft.trim().toUpperCase())
      setCodeDraft('')
    } catch {
      // surfaced via syncError
    } finally {
      setBusy(false)
    }
  }

  const shareLink = syncCode ? `${window.location.origin}${window.location.pathname}?sync=${syncCode}` : ''

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
      >
        {syncCode ? '🔗 동기화됨' : '🔗 기기 동기화'}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-10 w-80 max-w-[90vw] rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-xl">
          {syncCode ? (
            <>
              <h3 className="text-sm font-medium text-white">동기화 코드</h3>
              <p className="mt-1 text-xs text-slate-400">
                다른 기기에서 이 코드를 입력하거나, 아래 링크로 접속하면 같은 자산 데이터를 공유합니다.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-center text-lg tracking-widest text-white">
                  {syncCode}
                </span>
                <button
                  type="button"
                  onClick={() => void copy(syncCode, '코드')}
                  className="rounded-lg border border-slate-700 px-2 py-2 text-xs text-slate-300 hover:border-slate-500"
                >
                  복사
                </button>
              </div>
              <button
                type="button"
                onClick={() => void copy(shareLink, '링크')}
                className="mt-2 w-full rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
              >
                링크 복사
              </button>
              {copyHint && <p className="mt-2 text-[11px] text-emerald-400">{copyHint}</p>}
              <p className="mt-2 text-[11px] text-slate-500">
                {STATUS_LABEL[syncStatus]}
                {syncStatus === 'error' && syncError ? ` — ${syncError}` : ''}
              </p>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={onUnlink}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-red-500 hover:text-red-400"
                >
                  동기화 해제
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-sm font-medium text-white">기기 간 동기화</h3>
              <p className="mt-1 text-xs text-slate-400">
                이 기기의 자산 데이터를 다른 기기(휴대폰 등)와 공유합니다. 계정 로그인 없이 코드/링크로만
                연결됩니다.
              </p>

              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCreate()}
                className="mt-3 w-full rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
              >
                이 기기 데이터로 새 코드 만들기
              </button>

              <div className="mt-3 border-t border-slate-800 pt-3">
                <p className="text-xs text-slate-400">다른 기기에서 만든 코드 입력하기</p>
                <div className="mt-2 flex gap-2">
                  <input
                    value={codeDraft}
                    onChange={(e) => setCodeDraft(e.target.value)}
                    placeholder="코드 입력"
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm uppercase text-white placeholder:text-slate-600 placeholder:normal-case"
                  />
                  <button
                    type="button"
                    disabled={busy || !codeDraft.trim()}
                    onClick={() => void handleLink()}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
                  >
                    불러오기
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-amber-400">
                  주의: 코드를 불러오면 이 기기에 현재 저장된 데이터는 그 코드의 데이터로 덮어써집니다.
                </p>
              </div>
              {syncStatus === 'error' && syncError && <p className="mt-2 text-[11px] text-red-400">{syncError}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
