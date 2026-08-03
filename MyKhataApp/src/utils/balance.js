/**
 * Running-balance helper.
 *
 * The backend never stores a balance - it only derives a single final figure
 * per entry (amount + totalAdditionalDebt - totalPaid). This walks an entry's
 * transactions in chronological order so every row can show the balance as it
 * stood at that point in time.
 */

/**
 * Chronological order with a stable tiebreaker. The API orders payments by
 * `date` only, and dates are usually stored at midnight, so same-day
 * transactions would otherwise come back in an arbitrary order.
 */
const chronological = (a, b) =>
  (new Date(a.date) - new Date(b.date)) ||
  (new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

/**
 * Build the ledger for a single entry.
 *
 * @param {object} entry - entry from /api/entries/* (with `payments` included)
 * @returns {{
 *   opening: object,
 *   rows: object[],
 *   transactions: object[],
 *   totalPaid: number,
 *   totalAdditionalDebt: number,
 *   remaining: number,
 * }}
 */
export function getEntryLedger(entry) {
  const payments = [...(entry?.payments || [])].sort(chronological);
  const openingBalance = entry?.amount || 0;

  let running = openingBalance;
  const rows = payments.map((payment) => {
    running += payment.type === 'payment' ? -(payment.amount || 0) : (payment.amount || 0);
    return { ...payment, balanceAfter: running };
  });

  // The entry's original amount, presented as the first row of the ledger.
  const opening = {
    id: `${entry?.id}-opening`,
    date: entry?.date,
    type: 'additional_debt',
    amount: openingBalance,
    description: entry?.description || '-',
    imageUrl: null,
    isOpening: true,
    balanceAfter: openingBalance,
  };

  const totalPaid = payments
    .filter((p) => p.type === 'payment')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalAdditionalDebt = payments
    .filter((p) => p.type === 'additional_debt')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return {
    opening,
    rows,
    transactions: [opening, ...rows],
    totalPaid,
    totalAdditionalDebt,
    // Prefer the backend figure; `running` is the same value as a fallback.
    remaining: entry?.remaining ?? running,
  };
}

export default getEntryLedger;
