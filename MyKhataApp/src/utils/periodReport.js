/**
 * Period report builder - daily / weekly / monthly aggregation.
 *
 * Pure functions only: no React, no network. Everything the on-screen modal and
 * the PDF generator render comes out of `buildPeriodReport`, so the two can
 * never drift apart.
 *
 * The app models two directions in two tables, with `Payment.type` giving the
 * sign:
 *
 *   IAmOwedMoney (Customer, side 'owed')  additional_debt -> Give Product
 *                                         payment         -> Money Received
 *   IOweMoney    (Supplier, side 'owe')   additional_debt -> Take Product
 *                                         payment         -> Money Paid
 */

import { getEntryLedger } from './balance';
import { formatDate } from './format';

// ---------------------------------------------------------------------------
// Date range maths
// ---------------------------------------------------------------------------

export const PERIOD_TYPES = ['daily', 'weekly', 'monthly'];

export const PERIOD_LABELS = {
  daily: { title: 'Daily Report', unit: 'day', tab: 'Daily' },
  weekly: { title: 'Weekly Report', unit: 'week', tab: 'Weekly' },
  monthly: { title: 'Monthly Report', unit: 'month', tab: 'Monthly' },
};

/** Local midnight, time stripped. */
export const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** setDate() rolls over months/years and is DST-safe, unlike adding 86400000ms. */
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/**
 * Monday-start week.
 * getDay() is 0=Sun..6=Sat, so (day + 6) % 7 maps Mon->0 ... Sun->6.
 */
export const startOfWeek = (d) => {
  const x = startOfDay(d);
  return addDays(x, -((x.getDay() + 6) % 7));
};

export const startOfMonth = (d) => {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
};

/** setDate(1) must come first, otherwise Jan 31 + 1 month lands on Mar 3. */
export const addMonths = (d, n) => {
  const x = startOfDay(d);
  x.setDate(1);
  x.setMonth(x.getMonth() + n);
  return x;
};

/**
 * Inclusive start, EXCLUSIVE end. Every downstream comparison is
 * `start <= t < end`, which is what keeps a midnight-stamped row on a period
 * boundary from being counted in both neighbouring periods.
 *
 * All arithmetic is local-time. Dates are created client-side as local Dates,
 * serialised to UTC ISO by axios, and revived with `new Date(iso)` - a lossless
 * round-trip for a user who stays in one timezone.
 */
export function getPeriodRange(periodType, anchorDate) {
  const anchor = startOfDay(anchorDate || new Date());

  if (periodType === 'weekly') {
    const start = startOfWeek(anchor);
    return { start, end: addDays(start, 7) };
  }
  if (periodType === 'monthly') {
    const start = startOfMonth(anchor);
    return { start, end: addMonths(start, 1) };
  }
  return { start: anchor, end: addDays(anchor, 1) };
}

/** Last millisecond of the period - for display only, never for comparisons. */
export const inclusiveEnd = (end) => new Date(end.getTime() - 1);

/** "18 Aug 2026" / "17 Aug 2026 - 23 Aug 2026" / "August 2026" */
export function formatPeriodLabel(periodType, start, end) {
  if (periodType === 'monthly') {
    return start.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
  }
  if (periodType === 'weekly') {
    return `${formatDate(start)} - ${formatDate(inclusiveEnd(end))}`;
  }
  return formatDate(start);
}

// ---------------------------------------------------------------------------
// Event classification
// ---------------------------------------------------------------------------

export const KIND = {
  GIVE_PRODUCT: 'GIVE_PRODUCT',
  MONEY_RECEIVED: 'MONEY_RECEIVED',
  TAKE_PRODUCT: 'TAKE_PRODUCT',
  MONEY_PAID: 'MONEY_PAID',
};

export const KIND_LABELS = {
  GIVE_PRODUCT: 'Give Product',
  MONEY_RECEIVED: 'Money Received',
  TAKE_PRODUCT: 'Take Product',
  MONEY_PAID: 'Money Paid',
};

export const KIND_HINTS = {
  GIVE_PRODUCT: 'Goods you handed over on credit. Customers now owe you more.',
  MONEY_RECEIVED: 'Cash customers actually paid you.',
  TAKE_PRODUCT: 'Goods you took from suppliers on credit. You now owe them more.',
  MONEY_PAID: 'Cash you actually handed to suppliers.',
};

/** side: 'owe' = Supplier (IOweMoney), 'owed' = Customer (IAmOwedMoney). */
export function classifyKind(side, type) {
  const isSupplier = side === 'owe';
  if (type === 'payment') return isSupplier ? KIND.MONEY_PAID : KIND.MONEY_RECEIVED;
  return isSupplier ? KIND.TAKE_PRODUCT : KIND.GIVE_PRODUCT;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const normName = (s) => (s || '').trim().toLowerCase();

/**
 * Balance as it stood immediately BEFORE `boundary`.
 *
 * `transactions` is already chronological, so we can stop at the first row that
 * is not yet in the past. Returns 0 when the entry did not exist yet.
 */
function balanceAsOf(transactions, boundary) {
  let balance = 0;
  for (const t of transactions) {
    if (new Date(t.date) < boundary) balance = t.balanceAfter;
    else break;
  }
  return balance;
}

/** Stable ordering: date, then creation time, then name, then entry id. */
const chronological = (a, b) =>
  a.date - b.date ||
  new Date(a.createdAt || 0) - new Date(b.createdAt || 0) ||
  a.personName.localeCompare(b.personName) ||
  String(a.entryId).localeCompare(String(b.entryId));

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

/**
 * @param {object}   args
 * @param {object[]} args.oweEntries   raw IOweMoney entries (with payments[])
 * @param {object[]} args.owedEntries  raw IAmOwedMoney entries (with payments[])
 * @param {'daily'|'weekly'|'monthly'} args.periodType
 * @param {Date}     args.anchorDate   any date inside the desired period
 * @param {string}   [args.scopeLabel] when set (e.g. a person's name), prefixes
 *   `meta.title` - lets a caller reuse this same report for a filtered subset
 *   of entries without the heading still reading like a global report.
 */
export function buildPeriodReport({
  oweEntries = [],
  owedEntries = [],
  periodType = 'daily',
  anchorDate = new Date(),
  scopeLabel,
} = {}) {
  const { start, end } = getPeriodRange(periodType, anchorDate);

  const sources = [
    ...owedEntries.map((entry) => ({ entry, side: 'owed' })), // Customer
    ...oweEntries.map((entry) => ({ entry, side: 'owe' })), // Supplier
  ];

  const rows = [];
  const accounts = new Map();
  let openReceivable = 0;
  let openPayable = 0;
  let closeReceivable = 0;
  let closePayable = 0;

  for (const { entry, side } of sources) {
    // Build the ledger over the entry's FULL history first. `balanceAfter` is a
    // running total seeded at entry.amount, so filtering payments before this
    // call would restart the walk and make every in-period balance wrong.
    const { transactions } = getEntryLedger(entry);

    const openingBalance = balanceAsOf(transactions, start);
    const closingBalance = balanceAsOf(transactions, end);

    if (side === 'owed') {
      openReceivable += openingBalance;
      closeReceivable += closingBalance;
    } else {
      openPayable += openingBalance;
      closePayable += closingBalance;
    }

    // Only now slice to the period. Each surviving row keeps its true balance.
    const inPeriod = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d < end;
    });

    const key = `${side}::${normName(entry.personName)}`;
    let acct = accounts.get(key);
    if (!acct) {
      acct = {
        key,
        side,
        sideLabel: side === 'owe' ? 'Supplier' : 'Customer',
        personName: entry.personName, // first-seen original casing
        entries: [],
        openingBalance: 0,
        closingBalance: 0,
        subtotals: {
          [KIND.GIVE_PRODUCT]: 0,
          [KIND.MONEY_RECEIVED]: 0,
          [KIND.TAKE_PRODUCT]: 0,
          [KIND.MONEY_PAID]: 0,
        },
        transactions: [],
      };
      accounts.set(key, acct);
    }
    acct.openingBalance += openingBalance;
    acct.closingBalance += closingBalance;

    const entryRows = inPeriod.map((t) => {
      const kind = classifyKind(side, t.type);
      const amount = t.amount || 0;
      acct.subtotals[kind] += amount;

      return {
        id: t.id,
        entryId: entry.id,
        date: new Date(t.date),
        createdAt: t.createdAt || entry.createdAt || null,
        personName: entry.personName,
        accountKey: key,
        side,
        sideLabel: acct.sideLabel,
        type: t.type,
        isOpening: !!t.isOpening,
        kind,
        kindLabel: KIND_LABELS[kind],
        label: t.isOpening ? `Opening Balance (${KIND_LABELS[kind]})` : KIND_LABELS[kind],
        amount,
        balanceAfter: t.balanceAfter,
        description: t.description || '',
        imageUrl: t.imageUrl || null,
        // + money in, - money out, 0 for goods moved on credit
        cashDelta:
          kind === KIND.MONEY_RECEIVED ? amount : kind === KIND.MONEY_PAID ? -amount : 0,
        // effect on (receivable - payable)
        positionDelta:
          kind === KIND.GIVE_PRODUCT || kind === KIND.MONEY_PAID ? amount : -amount,
      };
    });

    if (entryRows.length > 0) {
      acct.entries.push({
        entryId: entry.id,
        entryDate: new Date(entry.date),
        description: entry.description || '',
        status: entry.status,
        openingBalance,
        closingBalance,
        transactions: entryRows,
      });
      acct.transactions.push(...entryRows);
      rows.push(...entryRows);
    }
  }

  rows.sort(chronological);

  // Which names appear on each side, so a person present as both can be
  // cross-referenced instead of just looking duplicated.
  const namesBySide = { owe: new Set(), owed: new Set() };
  for (const acct of accounts.values()) {
    if (acct.transactions.length > 0) namesBySide[acct.side].add(normName(acct.personName));
  }

  const people = [...accounts.values()]
    .filter((a) => a.transactions.length > 0)
    .map((a) => {
      a.transactions.sort(chronological);
      a.entries.forEach((e) => e.transactions.sort(chronological));
      a.entries.sort((x, y) => x.entryDate - y.entryDate);
      a.openingBalance = round2(a.openingBalance);
      a.closingBalance = round2(a.closingBalance);
      a.netChange = round2(a.closingBalance - a.openingBalance);
      a.volume = round2(a.transactions.reduce((s, r) => s + r.amount, 0));
      a.alsoOnOtherSide = namesBySide[a.side === 'owe' ? 'owed' : 'owe'].has(
        normName(a.personName)
      );
      return a;
    })
    .sort((x, y) => y.volume - x.volume || x.personName.localeCompare(y.personName));

  // --- Summary -------------------------------------------------------------

  const bucket = (kind) => {
    const matching = rows.filter((r) => r.kind === kind);
    return {
      total: round2(matching.reduce((s, r) => s + r.amount, 0)),
      count: matching.length,
    };
  };

  const giveProduct = bucket(KIND.GIVE_PRODUCT);
  const moneyReceived = bucket(KIND.MONEY_RECEIVED);
  const takeProduct = bucket(KIND.TAKE_PRODUCT);
  const moneyPaid = bucket(KIND.MONEY_PAID);

  const opening = {
    receivable: round2(openReceivable),
    payable: round2(openPayable),
    net: round2(openReceivable - openPayable),
  };
  const closing = {
    receivable: round2(closeReceivable),
    payable: round2(closePayable),
    net: round2(closeReceivable - closePayable),
  };

  const netCashFlow = round2(moneyReceived.total - moneyPaid.total);
  const receivableChange = round2(giveProduct.total - moneyReceived.total);
  const payableChange = round2(takeProduct.total - moneyPaid.total);
  const netPositionChange = round2(receivableChange - payableChange);
  const creditMovement = round2(giveProduct.total - takeProduct.total);

  // The position walk and the event totals are two independent routes to the
  // same number. If they ever disagree, the ledger is being sliced too early.
  if (Math.abs(closing.net - opening.net - netPositionChange) > 0.01) {
    // eslint-disable-next-line no-console
    console.warn(
      '[periodReport] position mismatch:',
      { openingNet: opening.net, closingNet: closing.net, netPositionChange }
    );
  }

  return {
    meta: {
      periodType,
      anchorDate: new Date(anchorDate),
      start,
      end,
      endInclusive: inclusiveEnd(end),
      label: formatPeriodLabel(periodType, start, end),
      title: scopeLabel
        ? `${scopeLabel} - ${PERIOD_LABELS[periodType].title}`
        : PERIOD_LABELS[periodType].title,
      unit: PERIOD_LABELS[periodType].unit,
      isInProgress: end > new Date(),
      generatedAt: new Date(),
    },
    summary: {
      opening,
      closing,
      giveProduct,
      moneyReceived,
      takeProduct,
      moneyPaid,
      cashIn: moneyReceived.total,
      cashOut: moneyPaid.total,
      netCashFlow,
      receivableChange,
      payableChange,
      netPositionChange,
      creditMovement,
      transactionCount: rows.length,
      peopleCount: new Set(rows.map((r) => normName(r.personName))).size,
      accountCount: people.length,
      entryCount: new Set(rows.map((r) => r.entryId)).size,
      imageCount: rows.filter((r) => r.imageUrl).length,
      isEmpty: rows.length === 0,
    },
    people,
    transactions: rows,
  };
}

export default buildPeriodReport;
