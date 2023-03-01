import React, { useEffect, useState } from 'react';
import '../styles/BirthdayForm.css';

function BirthdayForm({ onSubmit }) {
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [maxVal, setMaxVal] = useState(31);

  useEffect(() => {
    setDay(1);

    const daysInMonth = (month) => {
      if (+month === 2) {
        return 28;
      } else if ([4, 6, 9, 11].includes(+month)) {
        return 30;
      } else {
        return 31;
      }
    };

    setMaxVal(daysInMonth(month));
  }, [month]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(month, day);
  };

  return (
    <div className='BirthdayForm'>
      <div className='BirthdayForm-instructions'>
        <p>
          Think of a date (e.g., your birthday, anniversary, etc.) that is
          special to you. Select the month -- [<strong>1</strong>] for January,
          [<strong>2</strong>] for February... [<strong>12</strong>] for
          December. Then select the day of the month (<strong>1 - 31</strong>).
          Finally, press the <strong>submit</strong> button to see every NASA
          "Picture of the Day" released on that date.
        </p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className='BirthdayForm-month-field'>
          <label>
            <p>Month: </p>
            <input
              type='number'
              min='1'
              max='12'
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              required
            />
          </label>
        </div>
        <div className='BirthdayForm-day-field'>
          <label>
            <p>Day: </p>
            <input
              type='number'
              min='1'
              max={maxVal}
              value={day}
              onChange={(event) => setDay(event.target.value)}
              required
            />
          </label>
        </div>
        <div className='BirthdayForm-submit-button'>
          <button type='submit'>Submit</button>
        </div>
      </form>
    </div>
  );
}

export default BirthdayForm;
