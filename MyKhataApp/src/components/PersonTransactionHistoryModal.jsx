import React, { useState } from 'react';
import { FiX, FiDownload, FiGrid, FiList } from 'react-icons/fi';
import jsPDF from 'jspdf';
import '../styles/PersonTransactionHistoryModal.css';

export default function PersonTransactionHistoryModal({ entry, onClose, isOpen }) {
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  if (!isOpen || !entry) return null;

  // ============ Helper Functions ============

  /**
   * Format date as "3 May 2026"
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  /**
   * Format currency as "50,000 PKR"
   */
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '0 PKR';
    const formatted = Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${formatted} PKR`;
  };

  /**
   * Format transaction type name based on context
   */
  const formatTypeName = (type) => {
    // Determine if this is a supplier (owe) or customer (owed) entry
    const isSupplier = entry.type === 'owe';
    
    if (type === 'payment') {
      return isSupplier ? 'Money Paid' : 'Money Received';
    } else if (type === 'additional_debt') {
      return isSupplier ? 'Take Product' : 'Give Product';
    }
    return type;
  };

  // ============ Data Calculations ============

  const payments = entry.payments || [];
  const originalAmount = entry.amount || 0;
  
  // Create combined transactions list with initial transaction first
  const allTransactions = [
    {
      date: entry.date,
      type: entry.type === 'owe' ? 'additional_debt' : 'additional_debt',
      amount: originalAmount,
      description: entry.description || '-',
      imageUrl: null,
    },
    ...payments,
  ];
  
  // Calculate total paid from all payments
  const totalPaid = payments.reduce((sum, payment) => {
    const amount = payment.type === 'payment' ? payment.amount || 0 : -(payment.amount || 0);
    return sum + amount;
  }, 0);

  // Use entry.remaining directly (calculated on backend) for accuracy
  const remainingAmount = entry.remaining || 0;

  // ============ PDF Generation ============

  const generatePDF = async () => {
    if (isGeneratingPDF) return;

    try {
      setIsGeneratingPDF(true);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15;

      // ---- Header ----
      pdf.setFontSize(20);
      pdf.setTextColor(33, 37, 41);
      pdf.text(`${entry.personName} - Transaction History`, pageWidth / 2, yPosition, {
        align: 'center',
      });

      yPosition += 12;

      pdf.setFontSize(10);
      pdf.setTextColor(108, 117, 125);
      const generatedDate = formatDate(new Date());
      pdf.text(`Generated: ${generatedDate}`, pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 8;
      pdf.setDrawColor(220, 220, 220);
      pdf.line(15, yPosition, pageWidth - 15, yPosition);

      // ---- Summary Section ----
      yPosition += 8;
      pdf.setFontSize(12);
      pdf.setTextColor(33, 37, 41);
      pdf.setFont(undefined, 'bold');
      pdf.text('Summary', 15, yPosition);

      yPosition += 8;
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(50, 50, 50);

      const summaryData = [
        ['Person Name:', entry.personName],
        ['Total Paid:', formatCurrency(totalPaid)],
        ['Remaining Amount:', formatCurrency(remainingAmount)],
        ['Created Date:', formatDate(entry.date)],
      ];

      const labelWidth = 50;
      summaryData.forEach(([label, value]) => {
        pdf.text(label, 15, yPosition);
        pdf.setFont(undefined, 'bold');
        pdf.text(value, 15 + labelWidth, yPosition);
        pdf.setFont(undefined, 'normal');
        yPosition += 6;
      });

      yPosition += 4;
      pdf.line(15, yPosition, pageWidth - 15, yPosition);

      // ---- Transactions Table ----
      yPosition += 8;
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(33, 37, 41);
      pdf.text('Transactions', 15, yPosition);

      yPosition += 8;

      // Table Headers
      const tableHeaders = ['Date', 'Type', 'Amount', 'Description'];
      const colWidths = [22, 35, 25, 98];
      const headerHeight = 7;

      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 0, 0);

      let xPos = 15;
      tableHeaders.forEach((header, index) => {
        pdf.setDrawColor(102, 126, 234);
        pdf.rect(xPos, yPosition, colWidths[index], headerHeight);
        pdf.text(header, xPos + 2, yPosition + 4);
        xPos += colWidths[index];
      });

      yPosition += headerHeight;

      // Table Rows
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(0, 0, 0);
      const rowHeight = 12;

      allTransactions.forEach((transaction, index) => {
        // Check if we need a new page
        if (yPosition + rowHeight > pageHeight - 15) {
          pdf.addPage();
          yPosition = 15;

          // Repeat headers on new page
          pdf.setFont(undefined, 'bold');
          pdf.setTextColor(0, 0, 0);
          let xPos = 15;
          tableHeaders.forEach((header, idx) => {
            pdf.setFontSize(9);
            pdf.setDrawColor(102, 126, 234);
            pdf.rect(xPos, yPosition, colWidths[idx], headerHeight);
            pdf.text(header, xPos + 2, yPosition + 4);
            xPos += colWidths[idx];
          });
          yPosition += headerHeight;
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(0, 0, 0);
        }

        // Alternate row colors
        if (index % 2 === 0) {
          pdf.setFillColor(248, 249, 250);
          pdf.rect(15, yPosition, pageWidth - 30, rowHeight, 'F');
        }

        // Row data
        const rowData = [
          formatDate(transaction.date),
          formatTypeName(transaction.type || 'payment'),
          formatCurrency(transaction.amount),
          transaction.description || '-',
        ];

        xPos = 15;
        pdf.setFontSize(9);
        rowData.forEach((cellData, cellIndex) => {
          pdf.text(cellData, xPos + 2, yPosition + 7);
          xPos += colWidths[cellIndex];
        });

        yPosition += rowHeight;
      });

      // ---- Images Section ----
      const transactionsWithImages = allTransactions.filter((t) => t.imageUrl);

      if (transactionsWithImages.length > 0) {
        yPosition += 6;
        if (yPosition + 20 > pageHeight - 15) {
          pdf.addPage();
          yPosition = 15;
        }

        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(33, 37, 41);
        pdf.text('Transaction Images', 15, yPosition);
        yPosition += 10;

        for (let i = 0; i < transactionsWithImages.length; i++) {
          const transaction = transactionsWithImages[i];

          // Check if we need a new page
          if (yPosition + 60 > pageHeight - 15) {
            pdf.addPage();
            yPosition = 15;
          }

          try {
            // Fetch and add image as thumbnail
            const response = await fetch(transaction.imageUrl);
            const blob = await response.blob();
            const imgData = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });

            // Add thumbnail (40mm x 40mm)
            pdf.addImage(imgData, 'JPEG', 15, yPosition, 40, 40);

            // Add transaction info next to image
            pdf.setFontSize(9);
            pdf.setFont(undefined, 'bold');
            pdf.text(
              formatDate(transaction.date),
              60,
              yPosition + 5
            );

            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(8);
            pdf.text(`Amount: ${formatCurrency(transaction.amount)}`, 60, yPosition + 12);
            if (transaction.description) {
              pdf.text(`Desc: ${transaction.description.substring(0, 25)}`, 60, yPosition + 18);
            }

            yPosition += 45;
          } catch {
            // If image fails to load, skip it
            pdf.setFontSize(9);
            pdf.setTextColor(200, 0, 0);
            pdf.text(`[Image unavailable - ${formatDate(transaction.date)}]`, 15, yPosition);
            pdf.setTextColor(50, 50, 50);
            yPosition += 8;
          }
        }
      }

      // ---- Footer ----
      yPosition = pageHeight - 12;
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.line(15, yPosition - 2, pageWidth - 15, yPosition - 2);
      const footerText = `MyKhataApp | Downloaded at ${new Date().toLocaleString('en-US')}`;
      pdf.text(footerText, pageWidth / 2, yPosition, { align: 'center' });

      // ---- Download PDF ----
      pdf.save(`${entry.personName}-Transaction-History.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ============ Render Methods ============

  /**
   * Render Summary Section
   */
  const renderSummary = () => (
    <div className="transaction-history-summary">
      <div className="summary-grid">
        <div className="summary-item">
          <span className="summary-label">Person Name</span>
          <span className="summary-value">{entry.personName || 'N/A'}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Created Date</span>
          <span className="summary-value">{formatDate(entry.date)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Paid</span>
          <span className="summary-value paid">{formatCurrency(totalPaid)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Remaining Amount</span>
          <span className="summary-value remaining">
            {formatCurrency(remainingAmount)}
          </span>
        </div>
      </div>
    </div>
  );

  /**
   * Render Table View
   */
  const renderTableView = () => (
    <div className="transaction-history-table">
      {allTransactions.length === 0 ? (
        <div className="empty-state">
          <p>No transactions yet</p>
        </div>
      ) : (
        <table className="transactions-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Image</th>
            </tr>
          </thead>
          <tbody>
            {allTransactions.map((transaction, index) => (
              <tr key={index} className={index % 2 === 0 ? 'row-even' : 'row-odd'}>
                <td>{formatDate(transaction.date)}</td>
                <td>
                  <span className={`type-badge type-${transaction.type}`}>
                    {formatTypeName(transaction.type)}
                  </span>
                </td>
                <td className="amount-cell">{formatCurrency(transaction.amount)}</td>
                <td className="description-cell">{transaction.description || '-'}</td>
                <td>
                  {transaction.imageUrl ? (
                    <a
                      href={transaction.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="image-link"
                      title="Click to view full image"
                    >
                      📷 View
                    </a>
                  ) : (
                    <span className="no-image">No image</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  /**
   * Render Cards View
   */
  const renderCardsView = () => (
    <div className="transaction-history-cards">
      {allTransactions.length === 0 ? (
        <div className="empty-state">
          <p>No transactions yet</p>
        </div>
      ) : (
        <div className="cards-grid">
          {allTransactions.map((transaction, index) => (
            <div key={index} className="transaction-card">
              <div className="card-header">
                <span className={`type-badge type-${transaction.type}`}>
                  {formatTypeName(transaction.type)}
                </span>
                <span className="card-date">{formatDate(transaction.date)}</span>
              </div>

              <div className="card-content">
                <div className="card-row">
                  <span className="card-label">Amount</span>
                  <span className="card-value amount">
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>

                <div className="card-row">
                  <span className="card-label">Description</span>
                  <span className="card-value">{transaction.description || '-'}</span>
                </div>

                {transaction.imageUrl && (
                  <div className="card-image-section">
                    <a
                      href={transaction.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card-image-link"
                      title="Click to view full image"
                    >
                      <img
                        src={transaction.imageUrl}
                        alt="Transaction"
                        className="card-thumbnail"
                      />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============ Main Render ============

  return (
    <div className="transaction-history-overlay">
      <div className="transaction-history-modal">
        {/* Header */}
        <div className="transaction-history-header">
          <h2>Transaction History</h2>
          <button
            className="close-button"
            onClick={onClose}
            title="Close"
            aria-label="Close modal"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="transaction-history-content">
          {/* Summary */}
          {renderSummary()}

          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <button
              className={`toggle-button ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Switch to table view"
            >
              <FiList size={18} />
              Table View
            </button>
            <button
              className={`toggle-button ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Switch to cards view"
            >
              <FiGrid size={18} />
              Cards View
            </button>
          </div>

          {/* Transactions Display */}
          {viewMode === 'table' ? renderTableView() : renderCardsView()}
        </div>

        {/* Footer */}
        <div className="transaction-history-footer">
          <button
            className="download-button"
            onClick={generatePDF}
            disabled={isGeneratingPDF}
            title="Download transaction history as PDF"
          >
            {isGeneratingPDF ? (
              <>
                <span className="spinner"></span>
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
