import { useState } from 'react';
import { useScenario } from './hooks/useScenario.js';
import { useBtcPrice } from './hooks/useBtcPrice.js';
import { Header, type Tab } from './components/Header.js';
import { SimpleCard, type SimpleInputs, SIMPLE_DEFAULTS } from './components/SimpleCard.js';
import { SimpleResult } from './components/SimpleResult.js';
import { SimpleAccumulation } from './components/SimpleAccumulation.js';
import { PlanTab } from './components/PlanTab.js';
import { ModelsTab } from './components/ModelsTab.js';
import { AboutPanel } from './components/AboutPanel.js';

export function App() {
  const { scenario, loading, error } = useScenario('default');
  const btc = useBtcPrice();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('simple');

  // Simple tab starts blank — the user fills in their own numbers. BTC price
  // gets auto-populated from the live CoinGecko spot inside SimpleCard.
  const [simple, setSimple] = useState<SimpleInputs>(SIMPLE_DEFAULTS);
  const simpleNow = simple;

  if (loading) return <div className="p-8 text-text-muted">Loading…</div>;
  if (error) return <div className="p-8 text-error">Error: {error}</div>;
  if (!scenario) return null;

  return (
    <>
      <Header tab={tab} onTabChange={setTab} onShowAbout={() => setAboutOpen(true)} />

      <main className="mx-auto max-w-[1180px] px-6 pb-12 pt-8">
        {tab === 'simple' ? (
          <>
            <div className="mb-8">
              <h2 className="mb-2 max-w-[760px] text-4xl font-bold leading-tight text-text-primary">
                How much BTC can I buy each month?
              </h2>
              <p className="max-w-[640px] text-base leading-relaxed text-text-secondary">
                Estimate monthly BTC buying power from income, taxes, expenses, and savings needs. Rough numbers are fine — you can enter after-tax income and set the tax rate to 0%.
              </p>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_380px]">
              <SimpleCard value={simpleNow} livePrice={btc.price} onChange={setSimple} />
              <SimpleResult inputs={simpleNow} />
            </div>

            <div className="mt-8">
              <SimpleAccumulation inputs={simpleNow} onShowModelsTab={() => setTab('models')} />
            </div>
          </>
        ) : tab === 'plan' ? (
          <PlanTab
            scenario={scenario}
            livePrice={btc.price}
            onShowModelsTab={() => setTab('models')}
          />
        ) : (
          <ModelsTab livePrice={btc.price} />
        )}
      </main>

      <AboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}
