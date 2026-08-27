import { useState } from 'react'
import type { AppSettings } from '../types'

interface Props {
  settings: AppSettings
  onChange: (s: AppSettings) => void
}

export function SettingsPanel({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [finnhubDraft, setFinnhubDraft] = useState(settings.finnhubApiKey)

  const save = () => {
    onChange({ ...settings, finnhubApiKey: finnhubDraft.trim() })
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
      >
        ⚙ 설정
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-10 w-80 max-w-[90vw] rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-xl">
          <h3 className="text-sm font-medium text-white">Finnhub API 키 (선택)</h3>
          <p className="mt-1 text-xs text-slate-400">
            해외 주식 시세는 우선 키 없이 Yahoo Finance로 조회를 시도합니다. 브라우저/네트워크에 따라 이게
            막히는 경우가 있어서, 아래 키를 등록해두면 자동으로 대체 조회합니다 (분당 60회, 안정적).{' '}
            <a
              href="https://finnhub.io/register"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:underline"
            >
              무료 발급받기
            </a>
          </p>
          <input
            value={finnhubDraft}
            onChange={(e) => setFinnhubDraft(e.target.value)}
            placeholder="Finnhub 키 입력"
            className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white placeholder:text-slate-600"
          />
          <p className="mt-2 text-[11px] text-slate-500">
            입력한 키는 이 브라우저의 localStorage에만 저장되며 서버로 전송되지 않습니다.
          </p>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-400"
            >
              저장
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
