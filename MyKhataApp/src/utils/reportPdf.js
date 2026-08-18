/**
 * PDF layout for the period report.
 *
 * Kept out of the modal so the component stays readable and the layout can be
 * changed without touching render logic. Follows the same jsPDF idioms as
 * PersonTransactionHistoryModal (manual rect tables, splitTextToSize
 * truncation, zebra rows) with two fixes: table headers repeat on every page,
 * and the footer is stamped on every page rather than only the last.
 */

import jsPDF from 'jspdf';
import { KIND, KIND_LABELS } from './periodReport';
import { formatCurrency, formatDate, formatDateTime, formatSignedCurrency } from './format';

const M = 15; // page margin
const USABLE = 180; // A4 width 210 - 2 * M
const BOTTOM = 18; // reserved strip so rows never collide with the footer

const HEADER_H = 7;
const ROW_H = 10;

/**
 * jsPDF's built-in Helvetica is WinAnsi-encoded. Characters outside it render
 * as garbage, so map the ones this app actually produces onto safe equivalents.
 */
const ascii = (value) =>
  String(value ?? '')
    .replace(/₨/g, 'PKR') // ₨
    .replace(/[→➔]/g, '->') // → ➔
    .replace(/[–—]/g, '-') // – —
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...');

export async function generateReportPdf(report, { userName } = {}) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const { meta, summary, people, transactions } = report;

  let y = M;

  // --- small helpers -------------------------------------------------------

  const text = (value, x, opts) => pdf.text(ascii(value), x, y, opts);

  /** Truncate a cell to its column width - jsPDF does not wrap. */
  const fit = (value, width) => {
    const lines = pdf.splitTextToSize(ascii(value), width - 4);
    return lines.length > 1 ? `${lines[0].trimEnd()}...` : lines[0] || '';
  };

  const newPage = () => {
    pdf.addPage();
    y = M;
  };

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - BOTTOM) {
      newPage();
      return true;
    }
    return false;
  };

  const drawTableHeader = (headers, cols, aligns = []) => {
    pdf.setFillColor(232, 242, 253);
    pdf.rect(M, y, USABLE, HEADER_H, 'F');
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(23, 78, 126);

    let x = M;
    headers.forEach((header, i) => {
      if (aligns[i] === 'right') {
        pdf.text(ascii(header), x + cols[i] - 2, y + 4.8, { align: 'right' });
      } else {
        pdf.text(ascii(header), x + 2, y + 4.8);
      }
      x += cols[i];
    });
    y += HEADER_H;
  };

  const drawRow = (cells, cols, aligns = [], isEven = false, bold = false) => {
    if (isEven) {
      pdf.setFillColor(248, 249, 250);
      pdf.rect(M, y, USABLE, ROW_H, 'F');
    }
    pdf.setFontSize(9);
    pdf.setFont(undefined, bold ? 'bold' : 'normal');
    pdf.setTextColor(33, 37, 41);

    let x = M;
    cells.forEach((cell, i) => {
      const value = fit(cell, cols[i]);
      if (aligns[i] === 'right') {
        pdf.text(value, x + cols[i] - 2, y + 6.5, { align: 'right' });
      } else {
        pdf.text(value, x + 2, y + 6.5);
      }
      x += cols[i];
    });
    y += ROW_H;
  };

  const sectionTitle = (label) => {
    ensureSpace(14);
    pdf.setFontSize(13);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(33, 37, 41);
    text(label, M);
    y += 7;
  };

  const paragraph = (body, { size = 8, color = [108, 117, 125], leading = 4 } = {}) => {
    pdf.setFontSize(size);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(...color);
    pdf.splitTextToSize(ascii(body), USABLE).forEach((line) => {
      ensureSpace(leading);
      pdf.text(line, M, y);
      y += leading;
    });
  };

  // --- 1. Title block ------------------------------------------------------

  pdf.setFontSize(20);
  pdf.setFont(undefined, 'bold');
  pdf.setTextColor(33, 37, 41);
  pdf.text(ascii(meta.title), pageWidth / 2, y, { align: 'center' });
  y += 9;

  pdf.setFontSize(12);
  pdf.setFont(undefined, 'normal');
  pdf.setTextColor(76, 163, 248);
  pdf.text(ascii(meta.label), pageWidth / 2, y, { align: 'center' });
  y += 7;

  pdf.setFontSize(9);
  pdf.setTextColor(108, 117, 125);
  const preparedFor = userName ? `Prepared for ${userName}  |  ` : '';
  pdf.text(
    ascii(`${preparedFor}Generated: ${formatDateTime(meta.generatedAt)}`),
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 5;

  if (meta.isInProgress) {
    pdf.setFontSize(8);
    pdf.setTextColor(133, 100, 4);
    pdf.text(
      ascii(`This ${meta.unit} is still in progress - figures cover activity recorded so far.`),
      pageWidth / 2,
      y,
      { align: 'center' }
    );
    y += 5;
  }

  pdf.setDrawColor(220, 220, 220);
  pdf.line(M, y, pageWidth - M, y);
  y += 8;

  // --- 2. Summary ----------------------------------------------------------

  sectionTitle('Summary');

  const summaryPairs = [
    ['Money Received', formatCurrency(summary.moneyReceived.total), 'Give Product', formatCurrency(summary.giveProduct.total)],
    ['Money Paid', formatCurrency(summary.moneyPaid.total), 'Take Product', formatCurrency(summary.takeProduct.total)],
    ['Net Cash Flow', formatSignedCurrency(summary.netCashFlow), 'Net Position Change', formatSignedCurrency(summary.netPositionChange)],
    ['Transactions', String(summary.transactionCount), 'People Involved', String(summary.peopleCount)],
  ];

  const LEFT_LABEL = M;
  const LEFT_VALUE = M + 52;
  const RIGHT_LABEL = M + 92;
  const RIGHT_VALUE = M + 148;

  pdf.setFontSize(10);
  summaryPairs.forEach(([l1, v1, l2, v2], index) => {
    ensureSpace(7);
    const emphasise = index === 2; // the two headline figures

    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(108, 117, 125);
    text(l1, LEFT_LABEL);
    text(l2, RIGHT_LABEL);

    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(...(emphasise ? [23, 78, 126] : [33, 37, 41]));
    text(v1, LEFT_VALUE);
    text(v2, RIGHT_VALUE);

    y += 6.5;
  });
  y += 3;

  // --- 3. Position table ---------------------------------------------------

  sectionTitle('Your position');

  const positionCols = [60, 40, 40, 40];
  const positionAligns = ['left', 'right', 'right', 'right'];
  drawTableHeader(['', 'Start of period', 'End of period', 'Change'], positionCols, positionAligns);

  drawRow(
    [
      'People owe you',
      formatCurrency(summary.opening.receivable),
      formatCurrency(summary.closing.receivable),
      formatSignedCurrency(summary.receivableChange),
    ],
    positionCols,
    positionAligns,
    true
  );
  drawRow(
    [
      'You owe people',
      formatCurrency(summary.opening.payable),
      formatCurrency(summary.closing.payable),
      formatSignedCurrency(summary.payableChange),
    ],
    positionCols,
    positionAligns,
    false
  );
  pdf.setDrawColor(200, 200, 200);
  pdf.line(M, y, pageWidth - M, y);
  drawRow(
    [
      'Net position',
      formatCurrency(summary.opening.net),
      formatCurrency(summary.closing.net),
      formatSignedCurrency(summary.netPositionChange),
    ],
    positionCols,
    positionAligns,
    false,
    true
  );

  y += 2;
  paragraph('Includes settled entries as well as pending ones.', { size: 7.5 });
  y += 4;

  // --- 4. What the two figures mean ---------------------------------------

  sectionTitle('How to read this report');
  paragraph(
    `Net Cash Flow (${formatSignedCurrency(summary.netCashFlow)}) is the cash that moved in and out of your hand this ${meta.unit}: money received from customers minus money paid to suppliers. It ignores goods given or taken on credit.`
  );
  y += 2;
  paragraph(
    `Net Position Change (${formatSignedCurrency(summary.netPositionChange)}) is how much better or worse your credit position got: the change in what people owe you, minus the change in what you owe others. It goes down when a customer pays you, because the debt disappears.`
  );
  y += 2;
  paragraph(
    'Neither figure is accounting profit. MyKhata records amounts owed, not what your goods cost or sold for, and real profit needs both a cost price and a sale price. These two numbers are the honest halves of the picture: one tracks cash, the other tracks credit.'
  );
  y += 6;

  // --- 5. Person by person -------------------------------------------------

  if (summary.isEmpty) {
    sectionTitle('Transactions');
    paragraph(
      `No transactions were recorded in this ${meta.unit}. Your position was unchanged at ${formatCurrency(summary.opening.net)} throughout.`,
      { size: 10, color: [33, 37, 41], leading: 5 }
    );
  } else {
    sectionTitle('Person by person');

    const personCols = [24, 30, 26, 26, 74];
    const personHeaders = ['Date', 'Type', 'Amount', 'Balance', 'Description'];
    const personAligns = ['left', 'left', 'right', 'right', 'left'];

    people.forEach((acct) => {
      // Never orphan a person header at the bottom of a page.
      const blockMinimum = 8 + 6 + HEADER_H + ROW_H * 2;
      ensureSpace(blockMinimum);

      pdf.setFillColor(240, 245, 255);
      pdf.rect(M, y, USABLE, 8, 'F');
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(23, 78, 126);
      pdf.text(ascii(`${acct.personName}  (${acct.sideLabel})`), M + 2, y + 5.5);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(80, 80, 80);
      pdf.text(
        ascii(
          `Opening ${formatCurrency(acct.openingBalance)}  ->  Closing ${formatCurrency(acct.closingBalance)}`
        ),
        pageWidth - M - 2,
        y + 5.5,
        { align: 'right' }
      );
      y += 10;

      const kinds =
        acct.side === 'owed'
          ? [KIND.GIVE_PRODUCT, KIND.MONEY_RECEIVED]
          : [KIND.TAKE_PRODUCT, KIND.MONEY_PAID];
      const subtotalText = kinds
        .map((k) => `${KIND_LABELS[k]} ${formatCurrency(acct.subtotals[k])}`)
        .concat(`Net change ${formatSignedCurrency(acct.netChange)}`)
        .join('   |   ');

      pdf.setFontSize(8);
      pdf.setTextColor(108, 117, 125);
      text(subtotalText, M);
      y += 6;

      drawTableHeader(personHeaders, personCols, personAligns);

      let rowIndex = 0;
      const showEntryDividers = acct.entries.length > 1;

      acct.entries.forEach((entryGroup) => {
        if (showEntryDividers) {
          // A break here lands mid-table, so the column headers must come back.
          if (ensureSpace(6 + ROW_H)) {
            drawTableHeader(personHeaders, personCols, personAligns);
          }
          pdf.setFontSize(8);
          pdf.setFont(undefined, 'italic');
          pdf.setTextColor(108, 117, 125);
          const desc = entryGroup.description ? ` - "${entryGroup.description}"` : '';
          text(`Entry opened ${formatDate(entryGroup.entryDate)}${desc}`, M + 2);
          pdf.setFont(undefined, 'normal');
          y += 6;
        }

        entryGroup.transactions.forEach((row) => {
          if (y + ROW_H > pageHeight - BOTTOM) {
            newPage();
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'bold');
            pdf.setTextColor(80, 80, 80);
            text(`${acct.personName} (${acct.sideLabel}) - continued`, M);
            y += 8;
            drawTableHeader(personHeaders, personCols, personAligns);
          }

          drawRow(
            [
              formatDate(row.date),
              row.label,
              formatCurrency(row.amount),
              formatCurrency(row.balanceAfter),
              row.description || '-',
            ],
            personCols,
            personAligns,
            rowIndex % 2 === 0
          );
          rowIndex += 1;
        });
      });

      y += 6;
    });

    // --- 6. Full chronological table --------------------------------------

    newPage();
    sectionTitle('All transactions');
    paragraph(
      `${summary.transactionCount} transaction(s) across ${summary.peopleCount} person(s), in date order.`,
      { size: 8 }
    );
    y += 3;

    const allCols = [22, 34, 28, 26, 26, 44];
    const allHeaders = ['Date', 'Person', 'Type', 'Amount', 'Balance', 'Description'];
    const allAligns = ['left', 'left', 'left', 'right', 'right', 'left'];

    drawTableHeader(allHeaders, allCols, allAligns);

    transactions.forEach((row, index) => {
      if (y + ROW_H > pageHeight - BOTTOM) {
        newPage();
        drawTableHeader(allHeaders, allCols, allAligns);
      }
      drawRow(
        [
          formatDate(row.date),
          row.personName,
          row.label,
          formatCurrency(row.amount),
          formatCurrency(row.balanceAfter),
          row.description || '-',
        ],
        allCols,
        allAligns,
        index % 2 === 0
      );
    });

    if (summary.imageCount > 0) {
      y += 6;
      paragraph(
        `${summary.imageCount} transaction(s) in this ${meta.unit} have an attached bill image. Open the report in the app to view them.`,
        { size: 8 }
      );
    }
  }

  // --- 7. Footer on every page --------------------------------------------

  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    pdf.setPage(i);
    const fy = pageHeight - 10;
    pdf.setDrawColor(225, 225, 225);
    pdf.line(M, fy - 4, pageWidth - M, fy - 4);
    pdf.setFontSize(8);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(150, 150, 150);
    pdf.text(ascii(`MyKhataApp  |  ${meta.title}  |  ${meta.label}`), M, fy);
    pdf.text(ascii(`Page ${i} of ${pageCount}`), pageWidth - M, fy, { align: 'right' });
  }

  pdf.save(buildFileName(meta));
}

/** No "/" or ":" - those break the download on some platforms. */
function buildFileName(meta) {
  const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  if (meta.periodType === 'monthly') {
    const ym = `${meta.start.getFullYear()}-${String(meta.start.getMonth() + 1).padStart(2, '0')}`;
    return `MyKhataApp-Monthly-Report-${ym}.pdf`;
  }
  if (meta.periodType === 'weekly') {
    return `MyKhataApp-Weekly-Report-${iso(meta.start)}_to_${iso(meta.endInclusive)}.pdf`;
  }
  return `MyKhataApp-Daily-Report-${iso(meta.start)}.pdf`;
}

export default generateReportPdf;
