import { AssetChart } from './components/AssetChart'
import { CategoryDonutChart } from './components/CategoryDonutChart'
import { HoldingForm } from './components/HoldingForm'
import { HoldingsList } from './components/HoldingsList'
import { SettingsPanel } from './components/SettingsPanel'
import { SummaryCards } from './components/SummaryCards'
import { usePortfolio } from './hooks/usePortfolio'

function App() {
  const {
    holdings,
    addHolding,
    updateHolding,
    removeHolding,
    transactions,
    addTransaction,
    removeTransaction,
    settings,
    setSettings,
    prices,
    fxRate,
    fxUpdatedAt,
    refreshing,
    refreshAll,
    totalValueKRW,
    totalCostKRW,
    snapshots,
    avUsage,
    finnhubCooldownUntil,
    avCooldownUntil,
  } = usePortfolio()

  const hasStocks = holdings.some((h) => h.type === 'US_STOCK')
  const now = Date.now()
  const cooldownMessages = [
    hasStocks && finnhubCooldownUntil != null && now < finnhubCooldownUntil
      ? `Finnhub 호출 한도를 초과해서 약 ${Math.ceil((finnhubCooldownUntil - now) / 60_000)}분간 쉬어갑니다.`
      : null,
    hasStocks && avCooldownUntil != null && now < avCooldownUntil
      ? `Alpha Vantage 호출 한도를 초과해서 약 ${Math.ceil((avCooldownUntil - now) / 60_000)}분간 쉬어갑니다.`
      : null,
  ].filter((m): m is string => m != null)
  const existingCategories = [...new Set(holdings.map((h) => h.category?.trim()).filter((c): c is string => !!c))].sort(
    (a, b) => a.localeCompare(b),
  )

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-lg font-semibold text-white sm:text-xl">내 자산 대시보드</h1>
            <p className="text-xs text-slate-500">해외 주식 · 암호화폐 · 국내 ETF 통합 관리</p>
          </div>
          <SettingsPanel settings={settings} onChange={setSettings} avUsage={avUsage} />
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6">
        {cooldownMessages.length > 0 && (
          <div className="rounded-xl border border-amber-800/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
            {cooldownMessages.join(' ')} 자동으로 재개되며, 다른 시세 소스는 영향 없이 계속 갱신됩니다.
          </div>
        )}

        <SummaryCards
          totalValueKRW={totalValueKRW}
          totalCostKRW={totalCostKRW}
          fxRate={fxRate}
          fxUpdatedAt={fxUpdatedAt}
          refreshing={refreshing}
          onRefresh={refreshAll}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AssetChart snapshots={snapshots} />
          <CategoryDonutChart holdings={holdings} prices={prices} fxRate={fxRate} />
        </div>

        <div className="flex flex-col gap-3">
          <HoldingForm onAdd={addHolding} existingCategories={existingCategories} />
          <HoldingsList
            holdings={holdings}
            prices={prices}
            fxRate={fxRate}
            transactions={transactions}
            onUpdate={updateHolding}
            onRemove={removeHolding}
            onAddTransaction={addTransaction}
            onRemoveTransaction={removeTransaction}
          />
        </div>

        <footer className="pb-6 pt-2 text-center text-xs text-slate-600">
          시세는 참고용이며 실제 거래 기준과 다를 수 있습니다. 모든 데이터는 이 브라우저에만 저장됩니다.
        </footer>
      </main>
    </div>
  )
}

export default App
