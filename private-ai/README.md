# Stack Buddy + private AI (Maple, Venice)

## What's actually happening

Stack Buddy runs on your computer. When you clone this repo and run `npm run dev`, the calculator works locally — no accounts, no servers, nothing leaves your machine.

If you want to **talk** to your plan instead of just look at the audit table, paste [`prompt.md`](prompt.md) into a private AI chat. The math is in the prompt. Your scenario stays in the chat host you chose. That's it.

## Why this works

The Stack Buddy app hardcodes the Catch-Up Power Law math into the deterministic calculator. [`prompt.md`](prompt.md) is the **same math, in text form** — formulas, the catch-up overlay, a worked example, a sanity-check table, and posture rules that keep the LLM sober.

Two surfaces, one model. The app gives you the audit table. The prompt gives you the conversation. You can use either independently.

## Why Maple or Venice

Both are private AI hosts that match Stack Buddy's local-first posture. They use different architectures:

| | Maple | Venice |
|---|---|---|
| **Privacy model** | End-to-end encryption + secure enclaves (cryptographic proof the server runs the audited code) | Zero-knowledge / local-first (browser-only history, decentralized GPU inference) |
| **History sync across devices** | Yes, E2EE | No (intentional — clear browser cache, history is gone) |
| **Account required** | Optional | Optional / not required for basic use |
| **Best fit** | Permanent encrypted record across devices, sensitive document uploads | Stateless one-off reasoning, leave no trace |

Pick whichever matches your posture. The prompt works the same way in both.

The same prompt also runs in Claude.ai, ChatGPT, Gemini, or a local Ollama / LM Studio session. The math is identical. The privacy posture is then whatever that host gives you — read their privacy policy before pasting anything sensitive.

## How to use it (3 steps)

1. **Open Maple or Venice.** Start a fresh chat. Pick a model that handles a long first message — Kimi K2, GLM, DeepSeek, Llama 3.3, GPT-OSS, or whichever flagship the host offers.
2. **Paste [`prompt.md`](prompt.md) as message 1.** The whole file, top to bottom.
3. **As message 2, give the chat your situation.** Either:
   - Type your numbers: BTC target, deadline, current spot, monthly available, any planned lump sums.
   - Or paste an audit packet from the Stack Buddy app's Plan tab (the **"Copy audit packet for ChatGPT"** button — same packet works in any LLM).

That's the whole flow. Ask questions from there.

## What NOT to paste

No seed phrases. No private keys. No exchange logins or API keys. No tax documents. No bank account numbers. None of it is needed for planning — aggregate numbers (income, burn, savings, target) are enough.

## (Optional, for power users) In-app via API key

You can also wire Stack Buddy's chat panel to a provider via API key, so the chat lives inside the app's UI alongside the audit table. Setup details are in [`.env.example`](../.env.example):

- **Anthropic:** works out of the box. Set `ANTHROPIC_API_KEY` and restart `npm run dev`.
- **Maple Local Proxy:** enable Local Proxy in the Maple desktop app, then set `MAPLE_API_KEY` and `MAPLE_BASE_URL` in `.env`. Restart.
- **OpenAI / OpenAI-compatible:** set `OPENAI_API_KEY`.

Honestly, the paste-into-Venice-or-Maple path above is simpler AND more private. Use the API path only if you specifically want the chat inside the app's UI. The Plan-tab advisor (the inline-with-the-audit-table one) only runs through Anthropic — it uses Anthropic's tool-use schema specifically.
