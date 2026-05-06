# Stack Buddy + private AI (Maple, Venice, PPQ)

## What's actually happening

Stack Buddy is a deterministic calculator. It runs on your computer and does not call any LLM — no in-app chat, no AI advisor, nothing leaves your machine.

If you want to **talk through your plan with an AI**, take [`prompt.md`](prompt.md) (or click **Download the catch-up prompt** on the 3 Approaches tab) and attach it to a chat in one of the privacy-respecting hosts below. The math in the prompt is the same Catch-Up Power Law math the calculator uses. Your scenario stays in the chat host you chose.

## Why this works

The Stack Buddy app hardcodes the Catch-Up Power Law math into the deterministic calculator. [`prompt.md`](prompt.md) is the **same math, in text form** — formulas, the catch-up overlay, a worked example, a sanity-check trendline table, and posture rules that keep the LLM sober.

Two surfaces, one model. The app gives you the audit table. The prompt gives you the conversation. They're independent — neither calls the other.

## Three private AI hosts that work well with this prompt

| Host | Privacy model | Pay with | Best for |
|---|---|---|---|
| **Maple AI** | End-to-end encryption + secure enclaves; cryptographic proof the server runs the audited code | **Bitcoin** ✓ | Permanent encrypted record across devices, sensitive document uploads |
| **Venice AI** | Zero-knowledge / local-first; browser-only history, decentralized GPU inference | USD only | Stateless one-off reasoning, no account, leave no trace |
| **PPQ.ai** | Pay-per-query proxy; no email/account, doesn't store query content (logs IP + uses provider moderation API) | **Bitcoin** ✓ | Low-friction "let me just try this" without installing or signing up for a full host |

**Maple and Venice are full hosts** — sign in there (or use anonymously, in Venice's case), pick a model, paste the prompt. **PPQ is a pay-per-query proxy** — load up some credits, query through their API or playground. Maple and PPQ both accept Bitcoin payment, which matters if you'd rather not put a card on file.

The prompt also runs in mainstream LLMs (Claude.ai, ChatGPT, Gemini), but those aren't private — your scenario lands in their logs. Use them only if you don't mind that.

## How to use it (3 steps)

1. **Open Maple, Venice, or PPQ.** Start a fresh chat. Pick a model that handles a long first message — Kimi K2, GLM, DeepSeek, Llama 3.3, GPT-OSS, or whichever flagship the host offers.
2. **Attach or paste [`prompt.md`](prompt.md).** Most hosts let you attach files directly. If yours doesn't, paste the entire file content as message 1.
3. **As your next message, give the chat your situation.** Either:
   - Type your numbers: BTC target, deadline, current spot, monthly available (or income/tax/burn/savings — the prompt will derive monthly), any planned lump sums.
   - Or paste your plan from the Stack Buddy app's 3 Approaches tab (the **"Copy this plan"** button under the "Every buy" panel).

That's the whole flow. Ask questions from there.

## What NOT to paste

No seed phrases. No private keys. No exchange logins or API keys. No tax documents. No bank account numbers. None of it is needed for planning — aggregate numbers (income, burn, savings, target) are enough.
