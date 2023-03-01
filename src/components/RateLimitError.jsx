import React from 'react';
import '../styles/RateLimitError.css';

const RateLimitError = ({ message }) => {
  return (
    <div className='RateLimitError'>
      <p>{message}</p>
    </div>
  );
};

export default RateLimitError;
