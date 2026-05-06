# The Catch-Up Power Law

*The model this app uses for accumulation pricing.*

---

## Why we don't just use the Power Law

If you've spent any time around Bitcoin, you already know the Power Law. Price plotted on log-log paper traces a line, the line has held for fifteen years, and reasonable people use it as a long-term planning trendline. We're not going to re-explain it from scratch — there are better resources at the bottom of this page if you need them.

The problem is that the Power Law tells you where price *should* be, not where it *is*.

Today is **{{today}}**. Bitcoin is trading around **{{spot}}**. The Power Law trendline on the same day sits around **{{model}}**. The ratio between the two — what we call the **multiplier** — is **{{multiplier}}**.

The multiplier tells you where you stand relative to the long-term trend:

- **1.0×** means spot equals the trendline — BTC is "fairly priced" by the model.
- **Below 1.0×** means trading below trend. Historically these stretches have been the cheaper accumulation windows.
- **Above 1.0×** means trading above trend — into hotter territory.

The multiplier rarely sits at 1.0× for long. It spent most of 2022–2023 below 0.5× and topped 2.5× during the 2021 blow-off.

That gap matters for an accumulation app. If the calculator assumed every future purchase happened at the trendline price, it would misestimate your stack — understating it in the near term when BTC is below trend, overstating it in the medium term as the gap closes.

Neither version is right.

## What the catch-up model does

We anchor on today's actual spot price and assume Bitcoin geometrically converges to the 1.0x Power Law line by **June 30, 2028.** After that date, the planning path tracks the Power Law trendline.

The math is symmetric. If spot is *above* the trendline (multiplier > 1.0×), the path glides down to 1.0× by the catch-up date and then tracks trend; if spot is below (multiplier < 1.0×), it glides up. The model is built around the gap closing, not the direction the gap closes from.

That's it. Three pieces:

1. **Today's spot** — the real number you can buy at right now
2. **A convergence path** — a smooth climb from spot to trend over roughly two years
3. **Trend-following afterward** — once we're back on the line, we stay on it

We call this the **Catch-Up Power Law.** It's the same base equation you've seen elsewhere, with one modification: it starts where price actually is instead of pretending it's already on the line.

## What the path looks like

| Date | Assumed Spot | Power Law (1.0x) | Multiplier |
|---|---|---|---|
| May 1, 2026 | $78,000 | $130,000 | 0.60x |
| Sep 30, 2026 | $93,000 | $147,000 | 0.63x |
| Dec 31, 2026 | $107,000 | $159,000 | 0.67x |
| Jun 30, 2027 | $137,000 | $185,000 | 0.74x |
| Dec 31, 2027 | $175,000 | $215,000 | 0.81x |
| Mar 31, 2028 | $213,000 | $232,000 | 0.92x |
| **Jun 30, 2028** | **$249,000** | **$249,000** | **1.00x** |
| Dec 31, 2028 | $287,000 | $287,000 | 1.00x |
| Dec 31, 2029 | $378,000 | $378,000 | 1.00x |
| Dec 31, 2030 | $490,000 | $490,000 | 1.00x |
| Dec 31, 2031 | $630,000 | $630,000 | 1.00x |

The base Power Law numbers come from the B1M / Santostasi formulation: `Price = A × (days since genesis)^n`. Whether you use B1M's parameters or Santostasi's directly, the trendline lands in roughly the same place through the late 2020s.

Full monthly numbers (including bull and bear catch-up scenarios) live in [`btc-powerlaw-monthly-catchup-scenarios.csv`](./btc-powerlaw-monthly-catchup-scenarios.csv) alongside this doc.

## The choice this forces you to make

The catch-up date is an assumption. We picked June 30, 2028, but you should hold that loosely.

- **If catch-up happens earlier** — say, late 2027 — your near-term purchases buy more BTC than the model shows, but you have less time at cheap prices. The window closes faster.
- **If catch-up happens later** — say, end of 2029 — you get a longer accumulation window at below-trend prices, but the catch-up itself is steeper when it eventually comes.
- **If catch-up doesn't happen** — meaning the Power Law no longer describes Bitcoin's behavior — then the entire planning model needs to be revisited, and not just for this app.

The point of fixing a date isn't to predict the future. It's to give the calculator something concrete to work with so you can see how sensitive your plan is to that assumption. If your accumulation goal only works under "catch-up by mid-2027 with revenue at $1.5M," that's worth knowing. If it works under most of the catch-up scenarios you can imagine, that's also worth knowing.

## What this model is, and isn't

It is a planning model. It gives you a price path for thinking about accumulation under a "below trend now, back to trend later" assumption.

It is not a prediction. Bitcoin doesn't move smoothly along any curve, the Power Law itself may break down at some point, and the catch-up date is an educated guess. The app uses this path so the math has somewhere to start — not because the path is what will actually happen.

The honest framing: **if the Power Law continues to describe Bitcoin's long-term behavior, and if today's gap closes within a few years, here's what your accumulation plan looks like.** Two ifs. Both worth taking seriously, neither worth treating as certain.

---

## References

If you want to go deeper on the Power Law itself, these are the ones worth your time.

**Base equation we use**

- [B1M (b1m.io)](https://b1m.io/) — The Bitcoin1M model. This is what our catch-up path converges to.

**Canonical Power Law sources**

- [Bitcoin Power Law — Santostasi](https://bitcoinpower.law) — Giovanni Santostasi's original web app. Lets you input stack size, DCA schedule, and horizon to visualize projections along the trendline.
- [NewHedge Power Law Chart](https://newhedge.io/bitcoin/power-law) — Log-log fit with a clear explanation of why the relationship might hold. Includes ballpark price projections under the model.

**Live charts**

- [Bitbo Long-Term Power Law](https://charts.bitbo.io/long-term-power-law/) — Updates hourly. The cleanest "just show me the chart" view, with upper and lower bands.
- [Bitbo Power Law Rainbow](https://charts.bitbo.io/power-law-rainbow/) — Same idea with color-coded zones for cheap vs overheated.
- [Bitcoin Magazine Pro — Power Law](https://www.bitcoinmagazinepro.com/charts/bitcoin-power-law/) — More polished presentation. Regression curve with confidence bands over the full price history.

**Critique and probability framing**

- [Plan C — Power Law Probability Model](https://x.com/TheRealPlanC/status/1850697215553028420) — Treats the Power Law as a probability distribution rather than a single deterministic line. Worth reading specifically for the limits of the model and the common flaws in published regression fits.

---

*The Catch-Up Power Law is a planning assumption, not a forecast. Use it to size scenarios, stress-test your accumulation plan, and understand how sensitive your goals are to timing. Don't use it to make promises to yourself about what Bitcoin will do.*
