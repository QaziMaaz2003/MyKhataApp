import React, { useState } from 'react';
import Calendar from 'react-calendar';
import { FiFileText, FiCalendar } from 'react-icons/fi';
import 'react-calendar/dist/Calendar.css';
import {
  getPeriodRange,
  inclusiveEnd,
  startOfWeek,
  formatPeriodLabel,
  PERIOD_TYPES,
  PERIOD_LABELS,
} from '../utils/periodReport';
import { formatDate, formatDateLong } from '../utils/format';
import '../styles/PeriodReportBar.css';

/**
 * Dashboard control strip for the period report.
 *
 * Sits below the dashboard header rather than inside it: the header is a flex
 * row with its own media queries that collapses to a column at 480px, and a
 * selector + date field + button + range hint would fight all of them.
 */
export default function PeriodReportBar({
  periodType,
  onPeriodTypeChange,
  date,
  onDateChange,
  onGenerate,
  disabled = false,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const { start, end } = getPeriodRange(periodType, date);
  const endInclusive = inclusiveEnd(end);

  const handleCalendarChange = (value) => {
    // react-calendar hands back a Date, or a [Date, Date] range when
    // selectRange is on. Normalise defensively.
    const picked = Array.isArray(value) ? value[0] : value;
    if (picked) {
      onDateChange(picked);
      setPickerOpen(false);
    }
  };

  // Highlight the whole Mon-Sun band the selected day belongs to.
  const weeklyBandHighlighter = ({ date: tileDate, view }) =>
    view === 'month' && startOfWeek(tileDate).getTime() === startOfWeek(date).getTime()
      ? 'report-tile-in-week'
      : null;

  const calendarProps = {
    onChange: handleCalendarChange,
    value: date,
    maxDate: new Date(),
    calendarType: 'iso8601', // Monday-first columns, matching our week definition
  };

  return (
    <div className="report-bar">
      <span className="report-bar-label">
        <FiFileText size={17} />
        Report
      </span>

      <div className="report-segment-group">
        {PERIOD_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={`report-segment ${periodType === type ? 'active' : ''}`}
            onClick={() => onPeriodTypeChange(type)}
          >
            {PERIOD_LABELS[type].tab}
          </button>
        ))}
      </div>

      <div className="report-date-wrapper">
        <input
          type="text"
          readOnly
          className="report-date-input"
          value={
            periodType === 'monthly'
              ? start.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })
              : formatDate(date)
          }
          onClick={() => setPickerOpen(true)}
          title="Pick a date inside the period you want"
        />

        {pickerOpen && (
          <>
            <div className="report-calendar-backdrop" onClick={() => setPickerOpen(false)} />
            <div className="report-calendar-popover">
              {periodType === 'monthly' ? (
                // maxDetail="year" makes the month tile the deepest view, so
                // onChange fires with the 1st of the clicked month.
                <Calendar {...calendarProps} maxDetail="year" minDetail="decade" />
              ) : (
                <Calendar
                  {...calendarProps}
                  tileClassName={periodType === 'weekly' ? weeklyBandHighlighter : undefined}
                />
              )}
            </div>
          </>
        )}
      </div>

      <span className="report-range-hint">
        <FiCalendar size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
        {periodType === 'daily' ? (
          <strong>{formatDateLong(start)}</strong>
        ) : periodType === 'monthly' ? (
          <strong>{formatPeriodLabel('monthly', start, end)}</strong>
        ) : (
          <strong>
            {formatDateLong(start)} to {formatDateLong(endInclusive)}
          </strong>
        )}
      </span>

      <button
        type="button"
        className="report-generate-btn"
        onClick={onGenerate}
        disabled={disabled}
        title={disabled ? 'Loading your entries...' : 'Generate the report'}
      >
        <FiFileText size={17} />
        Generate Report
      </button>
    </div>
  );
}
