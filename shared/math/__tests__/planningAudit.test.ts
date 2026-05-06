import { describe, expect, it } from 'vitest';
import { buildPlanningModelSettings } from '../catchUp.js';
import {
  addMonthsUTC,
  evaluateContributionSchedule,
  isoDateUTC,
  reconcilePlanResult,
  type DeterministicContributionEvent,
} from '../planningAudit.js';

const model = buildPlanningModelSettings({
  spotAnchorDate: '2026-04-29',
  spotAnchorPrice: 75_800,
});

describe('evaluateContributionSchedule', () => {
  it('$5,000/month audit sum equals displayed deterministic BTC', () => {
    const firstBuy = new Date('2026-06-01T00:00:00Z');
    const events: DeterministicContributionEvent[] = Array.from({ length: 60 }, (_, i) => ({
      date: isoDateUTC(addMonthsUTC(firstBuy, i)),
      contribution_type: 'recurring',
      label: 'Test monthly buy',
      amount_usd: 5_000,
    }));

    const result = evaluateContributionSchedule({
      events,
      startingBtc: 0,
      deadline: isoDateUTC(addMonthsUTC(firstBuy, 59)),
      modelSettings: model,
      planStartDate: '2026-06-01',
      contributionFrequency: 'monthly',
      contributionTimingRule: 'first_day_of_month',
    });

    const auditBtc = result.auditRows.reduce((acc, row) => acc + row.btc_bought, 0);
    expect(result.totals.total_deployed).toBe(300_000);
    expect(result.totals.btc_at_deadline).toBeCloseTo(1.4455846134432981, 12);
    expect(auditBtc).toBeCloseTo(result.totals.btc_at_deadline, 12);
    expect(result.auditRows).toHaveLength(60);
    expect(reconcilePlanResult(result).ok).toBe(true);
  });

  it('lump-sum fixture reconciles total deployed and final BTC', () => {
    const schedule: Array<[string, number]> = [
      ['2026-06-01', 90_000],
      ['2026-10-01', 80_000],
      ['2027-02-01', 80_000],
      ['2027-07-01', 80_000],
      ['2027-12-01', 80_000],
      ['2028-04-01', 80_000],
      ['2028-10-01', 70_000],
      ['2029-04-01', 60_000],
      ['2029-10-01', 60_000],
      ['2030-04-01', 50_000],
      ['2030-10-01', 50_000],
    ];
    const events: DeterministicContributionEvent[] = schedule.map(([date, amount], i) => ({
      date,
      amount_usd: amount,
      contribution_type: 'lump',
      label: `Lump ${i + 1}`,
    }));

    const result = evaluateContributionSchedule({
      events,
      startingBtc: 0,
      deadline: '2030-12-31',
      modelSettings: model,
      planStartDate: '2026-06-01',
      contributionFrequency: 'custom',
      contributionTimingRule: 'custom',
    });

    const auditBtc = result.auditRows.reduce((acc, row) => acc + row.btc_bought, 0);
    const auditDeployed = result.auditRows.reduce((acc, row) => acc + row.amount_usd, 0);

    expect(result.totals.total_deployed).toBe(780_000);
    expect(auditDeployed).toBe(780_000);
    expect(result.totals.btc_at_deadline).toBeCloseTo(4.8864067987350595, 12);
    expect(auditBtc).toBeCloseTo(result.totals.btc_at_deadline, 12);
    expect(reconcilePlanResult(result).ok).toBe(true);
  });
});
