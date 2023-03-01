import { useState, useEffect } from 'react';
import axios from 'axios';
import Banner from './components/Banner';
import BirthdayForm from './components/BirthdayForm';
import PoDList from './components/PoDList';
import RateLimitError from './components/RateLimitError';
import { NASA_API_KEY } from './secrets';
import './App.css';

function App() {
  const [pods, setPods] = useState([]);
  const [birthday, setBirthday] = useState(null);

  useEffect(() => {
    const fetchData = async (year) => {
      try {
        // TODO --> Consider updating the query parameters associated w/ this request. Specifically...
        // set a 'thumbs' parameter to [true] to return the URL of a video thumbnail (if applicable).
        const response = await axios.get(
          `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}&date=${year}-${birthday.month}-${birthday.day}`
        );

        return response.data;
      } catch (error) {
        console.error(error);
        return null;
      }
    };

    const fetchAllData = async () => {
      if (birthday) {
        try {
          let currentMonth = Number(new Date().getMonth() + 1);
          let currentDay = Number(new Date().getDate());
          let currentYear;

          if (
            Number(birthday.month) <= currentMonth &&
            Number(birthday.day) <= currentDay
          ) {
            currentYear = new Date().getFullYear();
          } else {
            currentYear = new Date().getFullYear() - 1;
          }

          let startYear;

          // NASA began its PoD program in July of 1995.
          if (birthday.month >= 7) {
            startYear = 1995;
          } else {
            startYear = 1996;
          }

          let listOfYears = [];
          for (let i = currentYear - startYear; i >= 0; i--) {
            listOfYears.push(startYear + i);
          }

          const dataPromises = listOfYears.map((year) => fetchData(year));
          const podData = await Promise.all(dataPromises);

          setPods(podData);
        } catch (error) {
          console.error(error);
        }
      }
    };

    fetchAllData();
  }, [birthday]);

  const handleBirthdaySubmit = (month, day) => {
    setBirthday({ month, day });
  };

  return (
    <div className='App'>
      <div className='App-banner'>
        <Banner />
      </div>
      <BirthdayForm onSubmit={handleBirthdaySubmit} />
      {/* TODO --> Pass a more meaningful message to the 'RateLimitError' component. */}
      {pods ? <PoDList pods={pods} /> : <RateLimitError message={'sad'} />}
    </div>
  );
}

export default App;
