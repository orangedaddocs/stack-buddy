import { useState } from 'react';
import { useScenario } from './hooks/useScenario.js';
import { useBtcPrice } from './hooks/useBtcPrice.js';
import { useAIAvailability } from './hooks/useAIAvailability.js';
import { Header, type Tab } from './components/Header.js';
import { ChatPanel } from './components/ChatPanel.js';
import { SimpleCard, type SimpleInputs, SIMPLE_DEFAULTS } from './components/SimpleCard.js';
import { SimpleResult } from './components/SimpleResult.js';
import { SimpleAccumulation } from './components/SimpleAccumulation.js';
import { PlanTab } from './components/PlanTab.js';
import { ModelsTab } from './components/ModelsTab.js';
import { AboutPanel } from './components/AboutPanel.js';
import { PrivacyStrip, computeAIStripState } from './components/PrivacyStrip.js';

export function App() {
  const { scenario, loading, error } = useScenario('default');
  const btc = useBtcPrice();
  const { aiAvailable, advisorAvailable } = useAIAvailability();
  const [chatOpen, setChatOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('simple');
  // Session-level AI toggle. Defaults to OFF, even when an API key is
  // configured server-side. Strongest privacy posture by default: every
  // first-paint says "Local only — nothing leaves this computer." A user
  // who deliberately set a key opts in once per session via the Re-enable
  // AI button. The cost is one extra click per session for AI users; the
  // benefit is that nobody who downloads this and runs it accidentally
  // sends data anywhere.
  const [aiSessionEnabled, setAiSessionEnabled] = useState(false);

  // Simple tab starts blank — the user fills in their own numbers. BTC price
  // gets auto-populated from the live CoinGecko spot inside SimpleCard.
  const [simple, setSimple] = useState<SimpleInputs>(SIMPLE_DEFAULTS);
  const simpleNow = simple;

  const aiState = computeAIStripState({ aiAvailable, sessionEnabled: aiSessionEnabled });
  const aiOn = aiState === 'ai-on';
  // Plan advisor needs Anthropic specifically (planAdvise route uses Anthropic
  // SDK + tool use). When only Maple/OpenAI are configured, the chat works
  // but the advisor must stay hidden, otherwise the user clicks an enabled
  // button that 503s with a "not configured" error that contradicts the
  // strip's "AI is wired up" framing.
  const advisorOn = aiOn && advisorAvailable === true;

  if (loading) return <div className="p-8 text-text-muted">Loading…</div>;
  if (error) return <div className="p-8 text-error">Error: {error}</div>;
  if (!scenario) return null;

  return (
    <>
      <Header tab={tab} onTabChange={setTab} />

      <PrivacyStrip
        state={aiState}
        onToggleSession={() => setAiSessionEnabled((on) => !on)}
        onShowAbout={() => setAboutOpen(true)}
      />

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
            simple={simpleNow}
            livePrice={btc.price}
            aiAvailable={advisorOn}
            onShowModelsTab={() => setTab('models')}
          />
        ) : (
          <ModelsTab livePrice={btc.price} />
        )}
      </main>

      {aiOn && (
        <button
          onClick={() => setChatOpen(true)}
          className="btc-grad fixed bottom-6 right-6 z-40 rounded-full px-5 py-3.5 text-base font-semibold text-white shadow-[0_4px_16px_rgba(247,147,26,0.28)]"
        >
          Ask Stack Buddy
        </button>
      )}

      <ChatPanel scenario={scenario} open={chatOpen && aiOn} onClose={() => setChatOpen(false)} />

      <AboutPanel
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        aiState={aiState}
      />
    </>
  );
}
