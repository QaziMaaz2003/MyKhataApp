import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  FiX,
  FiDownload,
  FiUsers,
  FiList,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiArrowRight,
} from 'react-icons/fi';
import {
  buildPeriodReport,
  addDays,
  addMonths,
  KIND,
  KIND_LABELS,
  KIND_HINTS,
  PERIOD_TYPES,
  PERIOD_LABELS,
} from '../utils/periodReport';
import { formatCurrency, formatSignedCurrency, formatDate, formatDateLong } from '../utils/format';
import { generateReportPdf } from '../utils/reportPdf';
import '../styles/PeriodReportModal.css';

/** Maps a KIND onto its CSS colour suffix. */
const KIND_CLASS = {
  [KIND.GIVE_PRODUCT]: 'give',
  [KIND.MONEY_RECEIVED]: 'received',
  [KIND.TAKE_PRODUCT]: 'taken',
  [KIND.MONEY_PAID]: 'paid',
};

/**
 * Full daily / weekly / monthly report.
 *
 * Takes the Dashboard's already-fetched entry arrays and does all the
 * aggregation client-side - no network calls of its own.
 */
export default function PeriodReportModal({
  isOpen,
  onClose,
  periodType,
  anchorDate,
  oweEntries,
  owedEntries,
  userName,
}) {
  // Seeded from props so the Dashboard bar sets the starting point, but held
  // locally so the user can flip period without closing the modal.
  const [localPeriod, setLocalPeriod] = useState(periodType);
  const [localDate, setLocalDate] = useState(anchorDate);
  const [viewMode, setViewMode] = useState('by-person');
  const [showMath, setShowMath] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalPeriod(periodType);
      setLocalDate(anchorDate);
    }
  }, [isOpen, periodType, anchorDate]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  // Every hook is above this guard; the report itself is computed below it so
  // it never runs while the modal is closed.
  if (!isOpen) return null;

  const report = buildPeriodReport({
    oweEntries,
    owedEntries,
    periodType: localPeriod,
    anchorDate: localDate,
  });

  const { meta, summary, people, transactions } = report;
  const unit = PERIOD_LABELS[localPeriod].unit;

  const shiftPeriod = (direction) => {
    if (localPeriod === 'monthly') setLocalDate(addMonths(localDate, direction));
    else if (localPeriod === 'weekly') setLocalDate(addDays(localDate, 7 * direction));
    else setLocalDate(addDays(localDate, direction));
  };

  const handleDownload = async () => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    // jsPDF is synchronous and blocks the main thread; yield so React can paint
    // the spinner before the work starts.
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      await generateReportPdf(report, { userName });
      toast.success('Report downloaded');
    } catch (error) {
      console.error('Report PDF error:', error);
      toast.error('Could not generate the PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ============ Render helpers ============

  const signClass = (value) => (value >= 0 ? 'pos' : 'neg');

  const renderKindCard = (kind, bucket) => (
    <div className={`report-kind-card kind-${KIND_CLASS[kind]}`}>
      <span className="report-kind-label">{KIND_LABELS[kind]}</span>
      <span className="report-kind-amount">{formatCurrency(bucket.total)}</span>
      <span className="report-kind-count">
        {bucket.count} transaction{bucket.count === 1 ? '' : 's'}
      </span>
      <p className="report-kind-hint">{KIND_HINTS[kind]}</p>
    </div>
  );

  const renderRow = (row, index, withPerson) => (
    <tr key={row.id} className={index % 2 === 0 ? 'report-row-even' : ''}>
      <td>{formatDate(row.date)}</td>
      {withPerson && <td>{row.personName}</td>}
      {withPerson && (
        <td>
          <span className={`report-side-badge side-${row.side}`}>{row.sideLabel}</span>
        </td>
      )}
      <td>
        <span
          className={`report-kind-badge kind-${KIND_CLASS[row.kind]}${row.isOpening ? ' is-opening' : ''}`}
        >
          {row.label}
        </span>
      </td>
      <td className="report-amount-cell">{formatCurrency(row.amount)}</td>
      <td className={`report-balance-cell${row.balanceAfter < 0 ? ' negative' : ''}`}>
        {formatCurrency(row.balanceAfter)}
      </td>
      <td className="report-desc-cell" title={row.description || ''}>
        {row.description || '-'}
      </td>
      <td>
        {row.imageUrl ? (
          <a
            className="report-image-link"
            href={row.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View
          </a>
        ) : (
          '-'
        )}
      </td>
    </tr>
  );

  const renderPersonBlock = (acct) => {
    const showDividers = acct.entries.length > 1;
    const kinds =
      acct.side === 'owed'
        ? [KIND.GIVE_PRODUCT, KIND.MONEY_RECEIVED]
        : [KIND.TAKE_PRODUCT, KIND.MONEY_PAID];

    return (
      <div className="report-person-block" key={acct.key}>
        <div className="report-person-header">
          <div className="report-person-id">
            <span className="report-person-name">
              {acct.personName}
              <span className={`report-side-badge side-${acct.side}`}>{acct.sideLabel}</span>
            </span>
            <span className="report-person-meaning">
              {acct.side === 'owed'
                ? `Amount ${acct.personName} owes you`
                : `Amount you owe ${acct.personName}`}
            </span>
            {acct.alsoOnOtherSide && (
              <span className="report-cross-ref">
                Also appears as a {acct.side === 'owed' ? 'Supplier' : 'Customer'} below
              </span>
            )}
          </div>

          <div className="report-balance-flow">
            <span>
              Opening <strong>{formatCurrency(acct.openingBalance)}</strong>
            </span>
            <FiArrowRight size={15} />
            <span>
              Closing <strong>{formatCurrency(acct.closingBalance)}</strong>
            </span>
            <span className={`report-delta-chip ${signClass(acct.netChange)}`}>
              {formatSignedCurrency(acct.netChange)}
            </span>
          </div>
        </div>

        <div className="report-person-subtotals">
          {kinds.map((kind) => (
            <span key={kind}>
              {KIND_LABELS[kind]} <strong>{formatCurrency(acct.subtotals[kind])}</strong>
            </span>
          ))}
          <span>
            Transactions <strong>{acct.transactions.length}</strong>
          </span>
        </div>

        <div className="report-table-scroll">
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Balance After</th>
                <th>Description</th>
                <th>Bill</th>
              </tr>
            </thead>
            <tbody>
              {acct.entries.map((group) => (
                <React.Fragment key={group.entryId}>
                  {showDividers && (
                    <tr className="report-entry-divider">
                      <td colSpan={6}>
                        Entry opened {formatDate(group.entryDate)}
                        {group.description ? ` - "${group.description}"` : ''}
                      </td>
                    </tr>
                  )}
                  {group.transactions.map((row, i) => renderRow(row, i, false))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============ Main render ============

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="report-modal-header">
          <div className="report-modal-title">
            <h2>{meta.title}</h2>
            <p>{meta.label}</p>
          </div>
          <button className="report-close-btn" onClick={onClose} aria-label="Close report">
            <FiX size={24} />
          </button>
        </div>

        <div className="report-modal-content">
          {/* Period controls */}
          <div className="report-period-controls">
            <div className="report-tab-group">
              {PERIOD_TYPES.map((type) => (
                <button
                  key={type}
                  className={`report-tab ${localPeriod === type ? 'active' : ''}`}
                  onClick={() => setLocalPeriod(type)}
                >
                  {PERIOD_LABELS[type].tab}
                </button>
              ))}
            </div>

            <div className="report-tab-group">
              <button
                className="report-tab"
                onClick={() => shiftPeriod(-1)}
                title={`Previous ${unit}`}
                aria-label={`Previous ${unit}`}
              >
                <FiChevronLeft size={16} />
              </button>
              <button
                className="report-tab"
                onClick={() => shiftPeriod(1)}
                disabled={meta.isInProgress}
                title={meta.isInProgress ? `This is the current ${unit}` : `Next ${unit}`}
                aria-label={`Next ${unit}`}
              >
                <FiChevronRight size={16} />
              </button>
            </div>

            <span className="report-range-note">
              Covering{' '}
              <strong>
                {localPeriod === 'daily'
                  ? formatDateLong(meta.start)
                  : `${formatDateLong(meta.start)} to ${formatDateLong(meta.endInclusive)}`}
              </strong>
            </span>
          </div>

          {meta.isInProgress && (
            <div className="report-notice">
              <FiClock size={16} />
              This {unit} is still in progress - figures cover activity recorded so far.
            </div>
          )}

          {/* What happened */}
          <section className="report-section">
            <h3 className="report-section-title">What happened this {unit}</h3>
            <div className="report-kind-grid">
              {renderKindCard(KIND.GIVE_PRODUCT, summary.giveProduct)}
              {renderKindCard(KIND.MONEY_RECEIVED, summary.moneyReceived)}
              {renderKindCard(KIND.TAKE_PRODUCT, summary.takeProduct)}
              {renderKindCard(KIND.MONEY_PAID, summary.moneyPaid)}
            </div>
          </section>

          {/* The two headline figures */}
          <section className="report-section">
            <h3 className="report-section-title">Money &amp; position</h3>

            <div className="report-profit-grid">
              <div className="report-profit-card">
                <span className="report-profit-label">Net Cash Flow</span>
                <span className={`report-profit-value ${signClass(summary.netCashFlow)}`}>
                  {formatSignedCurrency(summary.netCashFlow)}
                </span>
                <p className="report-profit-hint">
                  Cash that moved in and out of your hand this {unit} - money received from
                  customers minus money paid to suppliers. It ignores goods given or taken on
                  credit.
                </p>
              </div>

              <div className="report-profit-card">
                <span className="report-profit-label">Net Position Change</span>
                <span className={`report-profit-value ${signClass(summary.netPositionChange)}`}>
                  {formatSignedCurrency(summary.netPositionChange)}
                </span>
                <p className="report-profit-hint">
                  How much better or worse your credit position got - the change in what people
                  owe you, minus the change in what you owe others. It goes down when a customer
                  pays you, because the debt disappears.
                </p>
              </div>
            </div>

            <div className="report-credit-movement">
              Credit Movement <strong>{formatSignedCurrency(summary.creditMovement)}</strong> -
              value of goods out minus goods in. The two figures above always add up to this.
            </div>

            <button className="report-math-toggle" onClick={() => setShowMath(!showMath)}>
              {showMath ? 'Hide' : 'Show'} how these are calculated
            </button>

            {showMath && (
              <div className="report-math">
                <div>
                  Net Cash Flow = {formatCurrency(summary.moneyReceived.total)} (Money Received)
                  &minus; {formatCurrency(summary.moneyPaid.total)} (Money Paid) ={' '}
                  {formatSignedCurrency(summary.netCashFlow)}
                </div>
                <div>
                  Net Position Change = ({formatCurrency(summary.giveProduct.total)} &minus;{' '}
                  {formatCurrency(summary.moneyReceived.total)}) &minus; (
                  {formatCurrency(summary.takeProduct.total)} &minus;{' '}
                  {formatCurrency(summary.moneyPaid.total)}) ={' '}
                  {formatSignedCurrency(summary.netPositionChange)}
                </div>
                <div>
                  Credit Movement = {formatCurrency(summary.giveProduct.total)} (Give Product)
                  &minus; {formatCurrency(summary.takeProduct.total)} (Take Product) ={' '}
                  {formatSignedCurrency(summary.creditMovement)}
                </div>
              </div>
            )}

            <p className="report-disclaimer">
              <strong>Why there is no single "profit" number.</strong> MyKhata records amounts
              owed, not what your goods cost or sold for, and real profit needs both a cost price
              and a sale price. The two figures above are the honest halves of the picture: one
              tracks cash, the other tracks credit.
            </p>
          </section>

          {/* Position */}
          <section className="report-section">
            <h3 className="report-section-title">Your position</h3>
            <div className="report-table-scroll">
              <table className="report-position-table">
                <thead>
                  <tr>
                    <th />
                    <th>Start of {unit}</th>
                    <th>End of {unit}</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>People owe you</td>
                    <td>{formatCurrency(summary.opening.receivable)}</td>
                    <td>{formatCurrency(summary.closing.receivable)}</td>
                    <td className={signClass(summary.receivableChange) === 'pos' ? 'report-pos' : 'report-neg'}>
                      {formatSignedCurrency(summary.receivableChange)}
                    </td>
                  </tr>
                  <tr>
                    <td>You owe people</td>
                    <td>{formatCurrency(summary.opening.payable)}</td>
                    <td>{formatCurrency(summary.closing.payable)}</td>
                    <td className={signClass(summary.payableChange) === 'pos' ? 'report-neg' : 'report-pos'}>
                      {formatSignedCurrency(summary.payableChange)}
                    </td>
                  </tr>
                  <tr className="report-position-net">
                    <td>Net position</td>
                    <td>{formatCurrency(summary.opening.net)}</td>
                    <td>{formatCurrency(summary.closing.net)}</td>
                    <td className={signClass(summary.netPositionChange) === 'pos' ? 'report-pos' : 'report-neg'}>
                      {formatSignedCurrency(summary.netPositionChange)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="report-footnote">Includes settled entries as well as pending ones.</p>
          </section>

          {/* Quick stats */}
          <div className="report-quick-stats">
            <div className="report-stat">
              <strong>{summary.transactionCount}</strong>
              Transactions
            </div>
            <div className="report-stat">
              <strong>{summary.peopleCount}</strong>
              People involved
            </div>
            <div className="report-stat">
              <strong>{summary.entryCount}</strong>
              Entries touched
            </div>
          </div>

          {/* Breakdown */}
          {summary.isEmpty ? (
            <div className="report-empty">
              <p>No transactions were recorded in this {unit}.</p>
              <p className="report-empty-sub">
                Your position was unchanged at {formatCurrency(summary.opening.net)} throughout.
              </p>
            </div>
          ) : (
            <>
              <div className="report-view-toggle">
                <button
                  className={`report-toggle-btn ${viewMode === 'by-person' ? 'active' : ''}`}
                  onClick={() => setViewMode('by-person')}
                >
                  <FiUsers size={17} />
                  By Person
                </button>
                <button
                  className={`report-toggle-btn ${viewMode === 'chronological' ? 'active' : ''}`}
                  onClick={() => setViewMode('chronological')}
                >
                  <FiList size={17} />
                  All Transactions
                </button>
              </div>

              {viewMode === 'by-person' ? (
                <div>{people.map(renderPersonBlock)}</div>
              ) : (
                <div className="report-table-scroll">
                  <table className="report-table is-wide">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Person</th>
                        <th>Side</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Balance After</th>
                        <th>Description</th>
                        <th>Bill</th>
                      </tr>
                    </thead>
                    <tbody>{transactions.map((row, i) => renderRow(row, i, true))}</tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="report-modal-footer">
          <span className="report-footer-meta">
            {summary.transactionCount} transaction{summary.transactionCount === 1 ? '' : 's'} in
            this {unit}
          </span>
          <button
            className="report-download-btn"
            onClick={handleDownload}
            disabled={isGeneratingPDF}
            title="Download this report as a PDF"
          >
            {isGeneratingPDF ? (
              <>
                <span className="report-spinner" />
                Generating PDF...
              </>
            ) : (
              <>
                <FiDownload size={18} />
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
