import React from 'react';
import '../styles/RateLimitError.css';

const RateLimitError = ({ message, onRetry }) => {
  return (
    <div className='RateLimitError' role='alert'>
      <div className='RateLimitError-header instrument-badge'>
        TELEMETRY FAULT // ARCHIVE INTERRUPTED
      </div>
      <p className='RateLimitError-message'>{message}</p>
      {onRetry && (
        <button
          type='button'
          className='RateLimitError-retry instrument-badge'
          onClick={onRetry}
        >
          RETRY CONNECTION
        </button>
      )}
    </div>
  );
};

export default RateLimitError;
