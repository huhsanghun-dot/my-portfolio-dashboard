import { useState } from 'react'
import { ALPHA_VANTAGE_DAILY_LIMIT } from '../lib/api/alphaVantage'
import type { ApiUsage } from '../lib/storage'
import type { AppSettings } from '../types'

interface Props {
  settings: AppSettings
  onChange: (s: AppSettings) => void
  avUsage: ApiUsage
}

export function SettingsPanel({ settings, onChange, avUsage }: Props) {
  const [open, setOpen] = useState(false)
  const [finnhubDraft, setFinnhubDraft] = useState(settings.finnhubApiKey)
  const [avDraft, setAvDraft] = useState(settings.alphaVantageApiKey)

  const save = () => {
    onChange({ ...settings, finnhubApiKey: finnhubDraft.trim(), alphaVantageApiKey: avDraft.trim() })
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
          <p className="text-xs text-slate-400">
            해외 주식 시세는 우선 키 없이 Yahoo Finance로 조회를 시도합니다. 브라우저/네트워크에 따라 이게
            막히는 경우가 있어서, 아래 보조 키를 등록해두면 자동으로 대체 조회합니다.
          </p>

          <h3 className="mt-3 text-sm font-medium text-white">Finnhub API 키 (권장 보조)</h3>
          <p className="mt-1 text-xs text-slate-400">
            분당 60회까지 허용되어 자동 갱신을 안정적으로 지원합니다.{' '}
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
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white placeholder:text-slate-600"
          />

          <h3 className="mt-4 text-sm font-medium text-white">Alpha Vantage API 키 (추가 백업, 선택)</h3>
          <p className="mt-1 text-xs text-slate-400">
            Finnhub까지 실패할 때만 마지막으로 시도됩니다. 무료 키는 하루 25회 · 분당 5회 제한이라 자동 갱신
            기본 소스로는 부족해요.{' '}
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
            value={avDraft}
            onChange={(e) => setAvDraft(e.target.value)}
            placeholder="Alpha Vantage 키 입력"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white placeholder:text-slate-600"
          />

          <p className="mt-2 text-[11px] text-slate-500">
            입력한 키는 이 브라우저의 localStorage에만 저장되며 서버로 전송되지 않습니다.
          </p>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">오늘 Alpha Vantage 호출 사용량 (추정)</span>
              <span
                className={
                  avUsage.count >= ALPHA_VANTAGE_DAILY_LIMIT
                    ? 'text-rose-400'
                    : avUsage.count >= ALPHA_VANTAGE_DAILY_LIMIT * 0.7
                      ? 'text-amber-400'
                      : 'text-slate-300'
                }
              >
                {avUsage.count} / {ALPHA_VANTAGE_DAILY_LIMIT}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${
                  avUsage.count >= ALPHA_VANTAGE_DAILY_LIMIT
                    ? 'bg-rose-500'
                    : avUsage.count >= ALPHA_VANTAGE_DAILY_LIMIT * 0.7
                      ? 'bg-amber-500'
                      : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(100, (avUsage.count / ALPHA_VANTAGE_DAILY_LIMIT) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              이 브라우저에서 오늘 보낸 호출 수를 세어본 값이라 실제 한도와 약간 다를 수 있어요.
            </p>
          </div>

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
