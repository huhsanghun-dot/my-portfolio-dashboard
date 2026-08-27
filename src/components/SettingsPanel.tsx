import { useState } from 'react'
import type { AppSettings } from '../types'

interface Props {
  settings: AppSettings
  onChange: (s: AppSettings) => void
}

export function SettingsPanel({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(settings.alphaVantageApiKey)

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
          <h3 className="text-sm font-medium text-white">Alpha Vantage API 키</h3>
          <p className="mt-1 text-xs text-slate-400">
            해외 주식 시세 조회에 사용됩니다. 이 키는 이 브라우저의 localStorage에만 저장되며 서버로 전송되지
            않습니다.{' '}
            <a
              href="https://www.alphavantage.co/support/#api-key"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:underline"
            >
              무료 발급받기
            </a>
          </p>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="API 키 입력"
            className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white placeholder:text-slate-600"
          />
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
              onClick={() => {
                onChange({ ...settings, alphaVantageApiKey: draft.trim() })
                setOpen(false)
              }}
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
