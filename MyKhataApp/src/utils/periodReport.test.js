import {
  startOfWeek,
  startOfDay,
  addDays,
  addMonths,
  getPeriodRange,
  classifyKind,
  buildPeriodReport,
  KIND,
} from './periodReport';

// ---------------------------------------------------------------------------
// Date maths
// ---------------------------------------------------------------------------

describe('startOfWeek (Monday-start)', () => {
  // Probe a whole week so the assertions do not depend on knowing which
  // weekday a hard-coded calendar date falls on.
  const week = Array.from({ length: 7 }, (_, i) => new Date(2026, 7, 17 + i));

  test('always lands on a Monday', () => {
    week.forEach((d) => expect(startOfWeek(d).getDay()).toBe(1));
  });

  test('never moves forward, and never back more than 6 days', () => {
    week.forEach((d) => {
      const start = startOfWeek(d);
      expect(start.getTime()).toBeLessThanOrEqual(startOfDay(d).getTime());
      expect(startOfDay(d) - start).toBeLessThan(7 * 24 * 60 * 60 * 1000);
    });
  });

  test('a Monday maps to itself', () => {
    const monday = week.find((d) => d.getDay() === 1);
    expect(startOfWeek(monday).getTime()).toBe(startOfDay(monday).getTime());
  });

  test('a Sunday maps back to the preceding Monday, not forward', () => {
    const sunday = week.find((d) => d.getDay() === 0);
    expect(startOfWeek(sunday).getTime()).toBe(startOfDay(addDays(sunday, -6)).getTime());
  });

  test('is idempotent', () => {
    week.forEach((d) => {
      expect(startOfWeek(startOfWeek(d)).getTime()).toBe(startOfWeek(d).getTime());
    });
  });
});

describe('addMonths', () => {
  test('Jan 31 + 1 month is 1 Feb, not 3 Mar', () => {
    const result = addMonths(new Date(2026, 0, 31), 1);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(1);
  });

  test('rolls over the year boundary', () => {
    const result = addMonths(new Date(2026, 11, 15), 1);
    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(0);
  });
});

describe('getPeriodRange', () => {
  test('daily spans exactly one day', () => {
    const { start, end } = getPeriodRange('daily', new Date(2026, 7, 18, 14, 30));
    expect(start.getDate()).toBe(18);
    expect(start.getHours()).toBe(0);
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  test('weekly spans exactly seven days from a Monday', () => {
    const { start, end } = getPeriodRange('weekly', new Date(2026, 7, 20));
    expect(start.getDay()).toBe(1);
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  test('monthly runs from the 1st to the 1st of the next month', () => {
    const { start, end } = getPeriodRange('monthly', new Date(2026, 11, 25));
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(11);
    expect(end.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(2027);
    expect(end.getMonth()).toBe(0);
  });
});

describe('classifyKind', () => {
  test('maps each side/type pair to the right vocabulary', () => {
    expect(classifyKind('owed', 'additional_debt')).toBe(KIND.GIVE_PRODUCT);
    expect(classifyKind('owed', 'payment')).toBe(KIND.MONEY_RECEIVED);
    expect(classifyKind('owe', 'additional_debt')).toBe(KIND.TAKE_PRODUCT);
    expect(classifyKind('owe', 'payment')).toBe(KIND.MONEY_PAID);
  });
});

// ---------------------------------------------------------------------------
// buildPeriodReport
// ---------------------------------------------------------------------------

const iso = (y, m, d) => new Date(y, m, d).toISOString();

/** Customer entry opened BEFORE August, with activity inside August. */
const aliCustomer = {
  id: 'ali-1',
  personName: 'Ali Traders',
  amount: 10000,
  date: iso(2026, 6, 10), // 10 Jul 2026
  description: 'Cement bags',
  status: 'pending',
  payments: [
    { id: 'p1', amount: 3000, type: 'payment', date: iso(2026, 7, 5), description: 'Part payment' },
    { id: 'p2', amount: 5000, type: 'additional_debt', date: iso(2026, 7, 20), description: 'More stock' },
  ],
};

/** Supplier entry opened INSIDE August. */
const bilalSupplier = {
  id: 'bilal-1',
  personName: 'Bilal Steel',
  amount: 4000,
  date: iso(2026, 7, 12), // 12 Aug 2026
  description: 'Rods',
  status: 'pending',
  payments: [
    { id: 'p3', amount: 1000, type: 'payment', date: iso(2026, 7, 25), description: 'Settled part' },
  ],
};

const august = () =>
  buildPeriodReport({
    owedEntries: [aliCustomer],
    oweEntries: [bilalSupplier],
    periodType: 'monthly',
    anchorDate: new Date(2026, 7, 15),
  });

describe('buildPeriodReport - August 2026', () => {
  test('totals each of the four event kinds', () => {
    const { summary } = august();
    expect(summary.giveProduct.total).toBe(5000);
    expect(summary.moneyReceived.total).toBe(3000);
    expect(summary.takeProduct.total).toBe(4000); // the supplier entry's opening row
    expect(summary.moneyPaid.total).toBe(1000);
    expect(summary.transactionCount).toBe(4);
    expect(summary.peopleCount).toBe(2);
  });

  test('derives both headline figures', () => {
    const { summary } = august();
    expect(summary.netCashFlow).toBe(2000); // 3000 in - 1000 out
    expect(summary.netPositionChange).toBe(-1000); // (5000-3000) - (4000-1000)
    expect(summary.creditMovement).toBe(1000); // 5000 - 4000
  });

  test('the two headline figures add up to credit movement', () => {
    const { summary } = august();
    expect(summary.netCashFlow + summary.netPositionChange).toBeCloseTo(
      summary.creditMovement,
      2
    );
  });

  test('opening and closing positions are walked from full history', () => {
    const { summary } = august();
    // Ali was owed 10,000 before August; Bilal's entry did not exist yet.
    expect(summary.opening.receivable).toBe(10000);
    expect(summary.opening.payable).toBe(0);
    // Ali: 10000 - 3000 + 5000. Bilal: 4000 - 1000.
    expect(summary.closing.receivable).toBe(12000);
    expect(summary.closing.payable).toBe(3000);
  });

  test('position walk and event totals agree (the integrity identity)', () => {
    const { summary } = august();
    expect(summary.closing.net - summary.opening.net).toBeCloseTo(
      summary.netPositionChange,
      2
    );
  });

  test('an entry opened before the period continues its running balance', () => {
    const { transactions } = august();
    const firstAli = transactions.find((t) => t.personName === 'Ali Traders');
    // The 3,000 payment must land at 7,000 - continuing from the pre-period
    // 10,000 - and not restart the walk at 0.
    expect(firstAli.amount).toBe(3000);
    expect(firstAli.balanceAfter).toBe(7000);
    expect(firstAli.isOpening).toBe(false);
  });

  test("an entry opened inside the period keeps its opening row", () => {
    const { transactions } = august();
    const opening = transactions.find((t) => t.isOpening);
    expect(opening.personName).toBe('Bilal Steel');
    expect(opening.kind).toBe(KIND.TAKE_PRODUCT);
    expect(opening.balanceAfter).toBe(4000);
    expect(opening.label).toBe('Opening Balance (Take Product)');
  });

  test('groups by side and person, sorted by volume', () => {
    const { people } = august();
    expect(people).toHaveLength(2);
    expect(people[0].personName).toBe('Ali Traders');
    expect(people[0].side).toBe('owed');
    expect(people[0].netChange).toBe(2000); // 12000 - 10000
    expect(people[1].side).toBe('owe');
    expect(people[1].netChange).toBe(3000); // 3000 - 0
  });

  test('transactions come back in chronological order', () => {
    const { transactions } = august();
    const times = transactions.map((t) => t.date.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe('buildPeriodReport - boundaries and edge cases', () => {
  test('a day report picks up only that day', () => {
    const { summary, transactions } = buildPeriodReport({
      owedEntries: [aliCustomer],
      oweEntries: [bilalSupplier],
      periodType: 'daily',
      anchorDate: new Date(2026, 7, 5),
    });
    expect(summary.transactionCount).toBe(1);
    expect(transactions[0].kind).toBe(KIND.MONEY_RECEIVED);
    expect(summary.netCashFlow).toBe(3000);
  });

  test('the day before that activity is empty but keeps the position', () => {
    const { summary } = buildPeriodReport({
      owedEntries: [aliCustomer],
      oweEntries: [bilalSupplier],
      periodType: 'daily',
      anchorDate: new Date(2026, 7, 4),
    });
    expect(summary.isEmpty).toBe(true);
    expect(summary.transactionCount).toBe(0);
    expect(summary.opening.net).toBe(summary.closing.net);
    expect(summary.opening.receivable).toBe(10000);
  });

  test('a row on the first day of a month belongs to that month only', () => {
    const firstOfMonth = {
      id: 'edge-1',
      personName: 'Edge Case',
      amount: 500,
      date: iso(2026, 8, 1), // 1 Sep 2026
      payments: [],
    };
    const sept = buildPeriodReport({
      owedEntries: [firstOfMonth],
      periodType: 'monthly',
      anchorDate: new Date(2026, 8, 20),
    });
    const aug = buildPeriodReport({
      owedEntries: [firstOfMonth],
      periodType: 'monthly',
      anchorDate: new Date(2026, 7, 20),
    });
    expect(sept.summary.transactionCount).toBe(1);
    expect(aug.summary.transactionCount).toBe(0);
  });

  test('a person on both sides yields two cross-referenced accounts', () => {
    const sameName = { ...bilalSupplier, personName: 'Ali Traders' };
    const { people } = buildPeriodReport({
      owedEntries: [aliCustomer],
      oweEntries: [sameName],
      periodType: 'monthly',
      anchorDate: new Date(2026, 7, 15),
    });
    expect(people).toHaveLength(2);
    expect(people.every((p) => p.alsoOnOtherSide)).toBe(true);
    expect(people.map((p) => p.side).sort()).toEqual(['owe', 'owed']);
  });

  test('names differing only by case and whitespace merge into one account', () => {
    const duplicate = { ...aliCustomer, id: 'ali-2', personName: '  ali traders ' };
    const { people } = buildPeriodReport({
      owedEntries: [aliCustomer, duplicate],
      periodType: 'monthly',
      anchorDate: new Date(2026, 7, 15),
    });
    expect(people).toHaveLength(1);
    expect(people[0].personName).toBe('Ali Traders'); // first-seen casing
    expect(people[0].entries).toHaveLength(2);
  });

  test('handles empty input without throwing', () => {
    const { summary, people, transactions } = buildPeriodReport({});
    expect(summary.isEmpty).toBe(true);
    expect(summary.netCashFlow).toBe(0);
    expect(summary.opening.net).toBe(0);
    expect(people).toEqual([]);
    expect(transactions).toEqual([]);
  });

  test('tolerates an entry with no payments array', () => {
    const bare = { id: 'bare', personName: 'No Payments', amount: 250, date: iso(2026, 7, 10) };
    const { summary } = buildPeriodReport({
      owedEntries: [bare],
      periodType: 'monthly',
      anchorDate: new Date(2026, 7, 15),
    });
    expect(summary.giveProduct.total).toBe(250);
    expect(summary.transactionCount).toBe(1);
  });
});
