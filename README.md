# Stack Buddy

![Plan your stack — set a target, set a deadline, see your three approaches](docs/screenshots/plan-your-stack.png)

Local-first BTC stacking planner. Type in a target and a deadline, see what it takes.

I built this for myself and figured I'd put it up in case anyone else wants it. Not financial advice, not tax advice, not a price prediction. Just a calculator that runs in your browser with the math in plain sight.

## What it does

Two questions:

1. **How much BTC can I buy each month?** Income, taxes, expenses, savings, BTC price → net dollars available, monthly DCA budget, five-year accumulation curve.

   ![Simple tab — How much BTC can I buy each month?](docs/screenshots/home.png)

2. **What schedule gets me to a BTC target by some deadline?** Compares flat monthly DCA, front-loaded buying, and DCA plus dated lump sums against your cash flow.

   ![Three approaches — Front-load, Monthly DCA, Custom mix](docs/screenshots/plan-strategies.png)

Every buy is priced by the same model and shown in an audit table you can export as CSV or JSON.

## Local-first

Runs on your machine. No accounts, no database, no cloud. Scenarios are JSON files in `scenarios/`. Exports are local files. Chats, if you save any, are local Markdown.

If you don't connect an AI provider, nothing leaves your computer. If you do, your scenario goes to whichever provider you configured. Privacy is theirs from then on.

## The three planning shapes

- **Monthly DCA** — flat $X per month until the deadline.
- **Front-load** — heavier early, lighter later. Tests "earlier sats are worth more" if you think price will rise.
- **DCA plus lump sums** — a recurring schedule with dated buys layered in for bonuses, tax refunds, distributions, asset sales.

All three flow through the same audit-row engine and end up in the same exportable table.

## The pricing model — Catch-Up Power Law

Anchor on today's BTC spot, glide-path geometrically to the B1M Power Law 1.0× trendline by **2028-06-30**, follow the trendline after.

That's it. Three pieces: today's price, a convergence path, trend-following afterward. Default anchor multiplier is 1.0×. Both the date and the multiplier are editable in the model code; both are visible in the Models tab.

The Models tab walks through the math and shows where the trendline lands on various dates. Full writeup: [docs/models/catch-up-power-law.md](docs/models/catch-up-power-law.md).

![Models tab — Catch-Up Power Law snapshot, parameters, and trendline projections](docs/screenshots/models.png)

It's a planning assumption, not a forecast. Change the assumption and the plan changes. That's the point.

## Auditability

Every projection emits a row per buy: date, type, USD amount, BTC price used, the 1.0× trendline price on that date, the multiplier (price ÷ trendline), BTC bought, cumulative BTC, cumulative dollars deployed, fiat value. The displayed totals reconcile against the row sums before they're shown; if anything is out of sync, the UI flags it red.

Three buttons on the audit panel: download CSV, export plan JSON, copy audit packet for ChatGPT.

## Income inputs

The Simple tab takes gross income plus a tax rate. If you'd rather not enter gross income:

- enter after-tax income and set the tax rate to 0%, or
- skip the Simple tab and use the Plan tab manual mode with your own monthly contribution.

Don't put seed phrases, private keys, exchange logins, or tax documents into this thing. None of that is needed for planning.

## AI is optional

The calculator is deterministic and works without any API key. AI is a reasoning aid for what-ifs the canned model doesn't cover ("what if I get a $5K bonus", "what if income drops in 2027", "what would have to change for this to work"). Numbers always come from the deterministic engine; the LLM is for talking through scenarios.

When AI is on, your scenario JSON is sent to the provider you configured. Leave the API fields blank if that's a problem.

## Bring your own key

**The recommended way to chat about your plan is to paste [`private-ai/prompt.md`](private-ai/prompt.md) into a private AI host (Maple or Venice). The math is in the prompt; your scenario stays in the chat host. No app setup needed.** If you want the chat panel inside Stack Buddy itself, see [`private-ai/`](private-ai/) for the API-key path.

## What this isn't

Not financial, tax, or legal advice. Not a trading bot. Not a price prediction. Not a Monte Carlo simulator. Not a portfolio optimizer. Not a retirement planner. Not a SaaS.

## Run it

```bash
npm install
npm run dev
```

Frontend on `http://localhost:2035`, backend on `:2034`. No `.env` required for the calculator — only for the AI bits.

| Script | What it does |
|---|---|
| `npm run dev` | Vite + Express together via concurrently |
| `npm test` | Vitest (math, schema, server) |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | ESLint over .ts/.tsx |

Stack: Vite + React + TypeScript + Tailwind + Recharts on the frontend; Node 20 + Express + TypeScript on the backend. Active math engine is at [shared/math/planningAudit.ts](shared/math/planningAudit.ts).

## Troubleshooting

**Port 2034/2035 conflict.** Change `port` in `web/vite.config.ts` and `PORT` in `.env`. The Vite proxy uses `127.0.0.1` (IPv4) explicitly to avoid IPv6/IPv4 routing collisions on some machines.

**Plan advisor or chat says "AI is optional and not currently configured".** You haven't set an API key. The calculator still works; set `ANTHROPIC_API_KEY` in `.env` and restart if you want the AI bits.

**BTC price shows `—` or `(stale)`.** CoinGecko's free endpoint rate-limits sometimes. The Simple tab lets you type a price directly to override.

## Status

Personal project. I'm not promising bug fixes, features, or uptime. Issues are fine to open. Forks are fine.

## Disclaimer

See [DISCLAIMER.md](DISCLAIMER.md), [PRIVACY.md](PRIVACY.md), [SUPPORT.md](SUPPORT.md). Short version: this is a planning tool, the math is visible, you own all the inputs and outputs, and bad assumptions produce bad outputs.

## License

MIT.
