import React from 'react';
import '../styles/BirthdayForm.css';

const MONTHS = [
  { value: 1, label: '01 - January' },
  { value: 2, label: '02 - February' },
  { value: 3, label: '03 - March' },
  { value: 4, label: '04 - April' },
  { value: 5, label: '05 - May' },
  { value: 6, label: '06 - June' },
  { value: 7, label: '07 - July' },
  { value: 8, label: '08 - August' },
  { value: 9, label: '09 - September' },
  { value: 10, label: '10 - October' },
  { value: 11, label: '11 - November' },
  { value: 12, label: '12 - December' },
];

export function getDaysInMonth(selectedMonth) {
  const m = Number(selectedMonth);
  if (m === 2) {
    // Allow Feb 29 for leap-year birthdays (1996, 2000, ..., 2024).
    return 29;
  }
  if ([4, 6, 9, 11].includes(m)) {
    return 30;
  }
  return 31;
}

function BirthdayForm({
  birthday,
  selectedYear,
  latestYear,
  onDateChange,
  onSelectToday,
}) {
  const now = new Date();
  const todayMonth = now.getMonth() + 1;
  const todayDay = now.getDate();

  const month = birthday?.month ?? todayMonth;
  const maxVal = getDaysInMonth(month);
  const day = Math.min(birthday?.day ?? todayDay, maxVal);
  const isTodaySelected =
    month === todayMonth &&
    day === todayDay &&
    selectedYear === latestYear;

  // WHY: Clamp `day` synchronously inside `handleMonthChange` rather than in a
  // post-render `useEffect` so switching from e.g. May 31 to February never
  // emits an invalid intermediate `(2, 31)` date.
  const handleMonthChange = (event) => {
    const nextMonth = Number(event.target.value);
    const nextMax = getDaysInMonth(nextMonth);
    const clampedDay = Math.min(day, nextMax);
    onDateChange(nextMonth, clampedDay);
  };

  const handleDayChange = (event) => {
    const nextDay = Number(event.target.value);
    onDateChange(month, nextDay);
  };

  const dayOptions = Array.from({ length: maxVal }, (_, idx) => idx + 1);

  return (
    <section className='BirthdayForm' aria-label='Date Selector'>
      <div className='BirthdayForm-instructions'>
        <p>
          Choose a birthday, anniversary, or any calendar date to explore every
          NASA Astronomy Picture of the Day captured on that day since June
          1995.
        </p>
      </div>

      <div className='BirthdayForm-controls' role='group' aria-label='Archive Date Dials'>
        <label className='BirthdayForm-field'>
          <span className='BirthdayForm-label instrument-badge'>MONTH</span>
          <select
            className='BirthdayForm-select numeric-readout'
            value={month}
            onChange={handleMonthChange}
            aria-label='Month'
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className='BirthdayForm-field BirthdayForm-field--day'>
          <span className='BirthdayForm-label instrument-badge'>DAY</span>
          <select
            className='BirthdayForm-select numeric-readout'
            value={day}
            onChange={handleDayChange}
            aria-label='Day of Month'
          >
            {dayOptions.map((d) => (
              <option key={d} value={d}>
                {String(d).padStart(2, '0')}
              </option>
            ))}
          </select>
        </label>

        <button
          type='button'
          className='BirthdayForm-today instrument-badge'
          onClick={onSelectToday}
          disabled={isTodaySelected}
          title="Jump to today's calendar date and current year"
        >
          TODAY
        </button>
      </div>
    </section>
  );
}

export default BirthdayForm;
