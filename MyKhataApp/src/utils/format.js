/**
 * Shared display formatters.
 *
 * `formatCurrency` previously existed only inside PersonTransactionHistoryModal
 * and `formatDate` was copy-pasted across five files. The period report and its
 * PDF generator both need them, so they live here instead of becoming copies
 * six and seven.
 *
 * Note: the existing call sites are deliberately left alone. The history modal
 * renders dates as 'en-US' + month:'long' while everything else uses 'en-PK' +
 * month:'short'; unifying them would change visible output on screens that
 * already shipped. New code uses the 'en-PK'/short convention below.
 */

/** "12,500 PKR" - rounded to whole rupees, thousands separated. */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '0 PKR';
  const rounded = Math.round(amount);
  const formatted = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${rounded < 0 ? '-' : ''}${formatted} PKR`;
}

/** "+12,500 PKR" / "-3,000 PKR" - always carries an explicit sign. */
export function formatSignedCurrency(amount) {
  const value = amount || 0;
  const body = formatCurrency(Math.abs(value));
  if (Math.round(value) === 0) return body;
  return `${value > 0 ? '+' : '-'}${body}`;
}

/** "18 Aug 2026" */
export function formatDate(date) {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}

/** "Mon, 18 Aug 2026" */
export function formatDateLong(date) {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-PK', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}

/** "18 Aug 2026, 4:05 pm" - for the PDF footer. */
export function formatDateTime(date) {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid date';
  }
}
